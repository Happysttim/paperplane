import { createTransport, type SMTPSentMessageInfo } from 'nodemailer';
import {
  SMTPServer,
  type SMTPServerDataStream,
  type SMTPServerSession,
} from 'smtp-server';
import { makeEml } from './eml';
import { mailParserStream } from './parser';
import type { DeliveryRecordBody, RouteEmailBody } from './type';
import { requestForward, requestRecord } from './request';
import config from './config';
import fs from 'node:fs';
import PQueue from 'p-queue';

const transporter = createTransport({
  host: config.postfix,
  port: config.postfixPort,
  secure: false,
  pool: true,
});

const queue = new PQueue({
  concurrency: 100,
});

/** 처리 실패 시 Postfix가 원본을 큐에 유지하고 재시도하도록 임시 오류를 반환합니다. */
const temporaryFailure = (): Error & { responseCode: number } =>
  Object.assign(new Error('Temporary mail processing failure; please retry later'), { responseCode: 451 });

const server = new SMTPServer({
  authOptional: true,

  onData: (
    stream: SMTPServerDataStream,
    session: SMTPServerSession,
    callback: (err?: Error | null, message?: string) => void,
  ) => {
    queue
      .add(async () => {
        const tmpPath = await makeEml(stream);
        try {
          const normalize = await mailParserStream(tmpPath);
          const recipients = session.envelope.rcptTo.map((to) => to.address);
          const mailFrom = session.envelope.mailFrom;
          const from = mailFrom === false ? '' : mailFrom.address;
          const contentSize = Buffer.byteLength(normalize.content, 'utf-8');

          const body: RouteEmailBody = {
            ...normalize,
            envelope: {
              from,
              recipients,
            },
            contentSize,
          };

          const forward = await requestForward(body);

          if (forward.status === 'failed') {
            throw temporaryFailure();
          }

          // 모든 전송 스트림이 끝난 뒤에만 finally에서 원본 파일을 삭제합니다.
          const results = await Promise.allSettled(
            forward.data
              .filter((route) => route.matches)
              .map(async (route) => {
                const result = await transporter.sendMail({
                  envelope: {
                    from,
                    to: route.destination,
                  },
                  raw: fs.createReadStream(tmpPath),
                });

                const records = normalizeDeliveryRecords(route.source, result);

                await Promise.all(
                  records.map(async (record) => {
                    const recorded = await requestRecord(record);
                    if (recorded.status === 'failed') {
                      // 이미 큐에 수락된 메일을 이력 오류만으로 다시 발송하지 않습니다.
                      console.error('Delivery record failed', record.eventId);
                    }
                  }),
                );
              }),
          );
          if (results.some((result) => result.status === 'rejected')) throw temporaryFailure();
        } finally {
          await fs.promises.unlink(tmpPath).catch(() => {});
        }
      })
      .then(() => callback())
      .catch(() => callback(temporaryFailure()));
  },
});

/** Postfix 큐 수락·거절 결과를 API 이력 형식으로 변환합니다. */
const normalizeDeliveryRecords = (
  source: string,
  info: SMTPSentMessageInfo,
): DeliveryRecordBody[] => {
  const records: DeliveryRecordBody[] = [];
  info.accepted.forEach((destination) => {
    records.push({
      eventId: crypto.randomUUID(),
      source: source.toLowerCase(),
      destination: destination.toLowerCase(),
      messageId: info.messageId,
      status: 'sent',
      detail: info.response || undefined,
    });
  });

  info.rejected.forEach((destination) => {
    records.push({
      eventId: crypto.randomUUID(),
      source: source.toLowerCase(),
      destination: destination.toLowerCase(),
      messageId: info.messageId,
      status: 'failed',
      detail: info.response || undefined,
    });
  });

  return records;
};

server.listen(config.listenPort);

process.on('SIGTERM', () => {
  transporter.close();
  server.close(() => {
    console.log('smtp server is closed...');
  });
});
