import {
  MailParser,
  type AddressObject,
  type AttachmentStream,
  type HeaderLines,
  type Headers,
  type HeaderValue,
  type MessageText,
} from 'mailparser';
import fs from 'node:fs';
import type { NormalizeMailBody, ParsedAttachment, ParsedHeader } from './type';

/** mailparser 헤더 값이 주소 객체인지 확인합니다. */
const isAddressObject = (
  value: HeaderValue | undefined,
): value is AddressObject => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'value' in value &&
    'text' in value &&
    'html' in value
  );
};

/** 문자열·배열 헤더와 구분하여 주소 객체만 반환합니다. */
const addressHeader = (
  headers: Headers,
  key: string,
): AddressObject | undefined => {
  const value = headers.get(key);

  if (!isAddressObject(value)) {
    return undefined;
  }

  return value;
};

/** 원본 파일의 본문과 첨부 메타데이터를 읽고 첨부 스트림을 소비합니다. */
const mailParserStream = (filePath: string): Promise<NormalizeMailBody> => {
  return new Promise((resolve, reject) => {
    const parser = new MailParser({
      checksumAlgo: 'sha256',
    });

    const parsedHeaders: ParsedHeader[] = [];
    const parsedAttachments: ParsedAttachment[] = [];
    const normalize: NormalizeMailBody = {
      headers: parsedHeaders,
      attachments: parsedAttachments,
      from: { name: '', address: '' },
      subject: '',
      date: new Date().toISOString(),
      content: '',
    };

    parser.on('headers', (headers: Headers) => {
      const subjectHeader = headers.get('subject');
      normalize.subject =
        typeof subjectHeader === 'string' ? subjectHeader : '';

      const dateHeader = headers.get('date');
      if (dateHeader instanceof Date) {
        normalize.date = dateHeader.toISOString();
      } else {
        normalize.date = new Date().toISOString();
      }

      const fromHeader = addressHeader(headers, 'from');
      const fallback =
        fromHeader === undefined
          ? ''
          : typeof fromHeader === 'string'
            ? fromHeader
            : fromHeader.text;
      const from = {
        address: fromHeader?.value[0]?.address || fallback,
        name: fromHeader?.value[0]?.name || fallback,
      };

      normalize.from = from;
    });

    parser.on('headerLines', (lines: HeaderLines) => {
      lines.forEach(({ key, line }) =>
        parsedHeaders.push({ key, value: line }),
      );
    });

    parser.on('data', (data: AttachmentStream | MessageText) => {
      if (data.type === 'attachment') {
        data.content.on('end', () => {
          parsedAttachments.push({
            filename: data.filename ?? '',
            contentType: data.contentType,
            size: data.size,
          });

          data.release();
        });

        data.content.on('error', reject);
        // 첨부를 소비하지 않으면 end가 발생하지 않아 DATA 처리가 멈춥니다.
        data.content.on('data', () => undefined);

        return;
      }

      if (data.type === 'text') {
        if (typeof data.html === 'string') {
          normalize.content = data.html;
          return;
        }

        normalize.content = data.text ?? '';
      }
    });

    parser.on('end', () => {
      normalize.attachments = parsedAttachments;
      normalize.headers = parsedHeaders;

      resolve(normalize);
    });

    parser.on('error', reject);

    fs.createReadStream(filePath).on('error', reject).pipe(parser);
  });
};

export { mailParserStream, type NormalizeMailBody };
