// SMTP 실행 이미지 안에서 외부 네트워크 없이 수행하는 DATA 통합 테스트입니다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { SMTPServer } = require('smtp-server');
const nodemailer = require('nodemailer');

/** 빈 로컬 포트에서 서버를 시작하고 실제 할당된 포트를 반환합니다. */
async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

test('SMTP DATA 처리와 API 장애 시 재시도 응답', { timeout: 60000 }, async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'paperplane-smtp-'));
  const key = crypto.randomBytes(32).toString('hex');
  const keyPath = path.join(directory, 'hmac.key');
  await fs.writeFile(keyPath, key);
  let mode = 'success';
  let delivered = 0;
  let lastMail;
  let records = 0;
  const signatures = [];
  const sink = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onData(stream, _session, callback) {
      stream.resume();
      stream.on('end', () => { delivered++; callback(); });
    },
  });
  const sinkPort = await listen(sink.server);
  const api = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const digest = crypto.createHash('sha256').update(raw).digest('hex');
    const plain = [req.headers['x-request-id'], req.headers['x-paperplane-timestamp'], digest].join('.');
    signatures.push(req.headers['x-paperplane-signature'] === crypto.createHmac('sha256', key).update(plain).digest('hex'));
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/record') {
      records++;
      res.statusCode = mode === 'record-error' ? 503 : 200;
      res.end(JSON.stringify({ status: mode === 'record-error' ? 'failed' : 'ok' }));
      return;
    }
    lastMail = JSON.parse(raw);
    if (mode === 'disconnect') return req.socket.destroy();
    if (mode === 'timeout') return;
    if (mode === 'http-error') {
      res.statusCode = 503;
      return res.end(JSON.stringify({ status: 'ok', data: [] }));
    }
    if (mode === 'invalid') return res.end(JSON.stringify({ status: 'ok', data: [{}] }));
    if (mode === 'failed') return res.end(JSON.stringify({ status: 'failed' }));
    res.end(JSON.stringify({ status: 'ok', data: mode === 'no-match' ? [] : [
      { source: 'alias@check.example', destination: 'receiver@check.example', matches: true },
    ] }));
  });
  const apiPort = await listen(api);
  const reservation = net.createServer();
  const appPort = await listen(reservation);
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['dist/index.mjs'], {
    env: {
      ...process.env,
      HMAC_KEY_PATH: keyPath,
      LISTEN_PORT: String(appPort),
      POSTFIX: '127.0.0.1',
      POSTFIX_PORT: String(sinkPort),
      REQUEST_ROUTE: `http://127.0.0.1:${apiPort}/route`,
      REQUEST_RECORD: `http://127.0.0.1:${apiPort}/record`,
      TMPDIR: directory,
    },
    stdio: 'ignore',
  });
  const client = nodemailer.createTransport({ host: '127.0.0.1', port: appPort, ignoreTLS: true });
  /** 외부 주소로 접속하지 않고 로컬 테스트 리스너에만 메일을 전송합니다. */
  const send = (attachments = []) => client.sendMail({
    from: 'sender@check.example', to: 'alias@check.example', subject: 'DATA check', text: 'hello', attachments,
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await client.verify(); ready = true; break; } catch {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    assert.ok(ready, 'SMTP app must start');
    await t.test('첨부 메일 전달, 본문 분석, HMAC과 발송 이력', async () => {
      await send([{ filename: 'sample.txt', content: 'attachment data' }]);
      assert.equal(delivered, 1);
      assert.equal(records, 1);
      assert.equal(lastMail.attachments[0].filename, 'sample.txt');
      assert.equal(lastMail.attachments[0].size, 15);
      assert.ok(signatures.every(Boolean));
    });
    for (const failure of ['failed', 'http-error', 'invalid', 'disconnect', 'timeout']) {
      await t.test(`${failure}: 451 응답, 전달 안 함`, async () => {
        mode = failure;
        await assert.rejects(send(), error => error.responseCode === 451);
        assert.equal(delivered, 1);
      });
    }
    await t.test('매칭 없음은 정상 수락하며 전달하지 않음', async () => {
      mode = 'no-match';
      await send();
      assert.equal(delivered, 1);
    });
    await t.test('이미 수락된 메일은 이력 API 오류만으로 재발송하지 않음', async () => {
      mode = 'record-error';
      await send();
      assert.equal(delivered, 2);
    });
    assert.deepEqual((await fs.readdir(directory)).filter(name => name.endsWith('.eml')), []);
  } finally {
    client.close();
    child.kill('SIGTERM');
    await once(child, 'exit');
    api.closeAllConnections();
    await new Promise(resolve => api.close(resolve));
    await new Promise(resolve => sink.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
