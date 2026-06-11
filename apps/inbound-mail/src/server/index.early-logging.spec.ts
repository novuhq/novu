import fs from 'node:fs';
import net from 'node:net';
import {
  InboundMailRequestLogger,
  InboundMailTenantResolver,
  InboundParseQueueService,
} from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';

import mailinServer, { __testInboundMailService } from './index';

/*
 * Validates that the inbound-mail SMTP pipeline writes the early `requests`
 * row as soon as SMTP DATA completes (before parse / BullMQ enqueue) and
 * threads the resulting `requestLogId` through the queue payload so the
 * worker can later append the terminal completion trace.
 *
 * Analytics initialization in `InboundMailService.initializeAnalytics` is
 * skipped in this test because the feature-flag env vars are unset. Instead
 * we stub `requestLogger` / `tenantResolver` directly on the
 * `InboundMailService` instance imported by the SMTP server.
 */
describe('Mailin SMTP DATA handler — early request logging', () => {
  const SMTP_HOST = '127.0.0.1';
  const SMTP_PORT = Number(process.env.PORT || 2525);

  let logReceivedStub: sinon.SinonStub;
  let logQueuedStub: sinon.SinonStub;
  let logQueueFailedStub: sinon.SinonStub;
  let logProcessingFailedStub: sinon.SinonStub;
  let resolveStub: sinon.SinonStub;
  let queueAddStub: sinon.SinonStub;

  function sendInboundMessage(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(SMTP_PORT, SMTP_HOST);
      const transcript: string[] = [];
      let buffer = '';

      const dataLines = [
        'From: <sender@example.com>',
        'To: <support@customer.com>',
        'Subject: Test inbound mail',
        'Message-ID: <log-test-message-id@example.com>',
        '',
        'Hello world',
        '.',
      ].join('\r\n');

      const script = [
        'EHLO test.local',
        'MAIL FROM:<sender@example.com>',
        'RCPT TO:<support@customer.com>',
        'DATA',
        dataLines,
        'QUIT',
      ];
      let step = 0;

      socket.setEncoding('utf8');
      socket.setTimeout(15_000, () => {
        socket.destroy(new Error('SMTP transaction timed out'));
      });

      socket.on('data', (chunk: string) => {
        buffer += chunk;
        const parts = buffer.split('\r\n');
        buffer = parts.pop() ?? '';
        for (const line of parts) {
          if (!line) continue;
          transcript.push(line);
          if (/^\d{3} /.test(line)) {
            const next = script[step++];
            if (next != null) {
              socket.write(`${next}\r\n`);
            }
          }
        }
      });

      socket.on('error', reject);
      socket.on('close', () => resolve(transcript));
    });
  }

  before(async function before() {
    this.timeout(30_000);
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      const smtp = (mailinServer as unknown as { _smtp: unknown })._smtp;
      if (smtp) {
        try {
          await new Promise<void>((resolve, reject) => {
            const probe = net.connect(SMTP_PORT, SMTP_HOST);
            probe.once('connect', () => {
              probe.end();
              resolve();
            });
            probe.once('error', reject);
            probe.setTimeout(1000, () => probe.destroy(new Error('probe timeout')));
          });

          return;
        } catch {
          // not ready yet
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    this.skip();
  });

  let originalRequestLogger: typeof __testInboundMailService.requestLogger;
  let originalTenantResolver: typeof __testInboundMailService.tenantResolver;

  beforeEach(() => {
    logReceivedStub = sinon.stub().resolves('req_test_123');
    logQueuedStub = sinon.stub().resolves();
    logQueueFailedStub = sinon.stub().resolves();
    logProcessingFailedStub = sinon.stub().resolves();
    resolveStub = sinon.stub().resolves({
      organizationId: 'org_test',
      environmentId: 'env_test',
      transactionId: 'log-test-message-id@example.com',
    });

    originalRequestLogger = __testInboundMailService.requestLogger;
    originalTenantResolver = __testInboundMailService.tenantResolver;
    __testInboundMailService.requestLogger = {
      logReceived: logReceivedStub,
      logQueued: logQueuedStub,
      logQueueFailed: logQueueFailedStub,
      logProcessingFailed: logProcessingFailedStub,
    } as unknown as InboundMailRequestLogger;
    __testInboundMailService.tenantResolver = {
      resolve: resolveStub,
    } as unknown as InboundMailTenantResolver;
  });

  afterEach(() => {
    sinon.restore();
    __testInboundMailService.requestLogger = originalRequestLogger;
    __testInboundMailService.tenantResolver = originalTenantResolver;
  });

  it('writes the early request log row, attaches requestLogId to the queue payload, and traces request_queued on success', async () => {
    queueAddStub = sinon.stub(InboundParseQueueService.prototype, 'add').resolves(undefined as never);

    const transcript = await sendInboundMessage();
    const acceptedReply = transcript.find((line) => line.startsWith('250 ') && line.toLowerCase().includes('queued'));
    expect(acceptedReply, `expected 250 OK on success, transcript: ${transcript.join(' | ')}`).to.exist;

    // Give the post-queue trace promise a beat to flush after SMTP returns.
    await new Promise((r) => setTimeout(r, 250));

    sinon.assert.calledOnce(resolveStub);
    sinon.assert.calledOnce(logReceivedStub);
    sinon.assert.calledOnce(queueAddStub);

    const enqueueCallArg = queueAddStub.getCall(0).args[0];
    expect(enqueueCallArg.data.requestLogId).to.equal('req_test_123');
    expect(enqueueCallArg.data.subject).to.equal('Test inbound mail');

    sinon.assert.calledOnce(logQueuedStub);
    const queuedContext = logQueuedStub.getCall(0).args[0];
    expect(queuedContext.requestLogId).to.equal('req_test_123');
    expect(queuedContext.environmentId).to.equal('env_test');

    sinon.assert.notCalled(logQueueFailedStub);
    sinon.assert.notCalled(logProcessingFailedStub);
  });

  it('writes a request_failed trace when processing fails after the early row is written', async () => {
    const readFileStub = sinon.stub(fs.promises, 'readFile').rejects(new Error('Simulated parse failure'));

    const transcript = await sendInboundMessage();
    const retryReply = transcript.find((line) => line.startsWith('451 '));
    expect(retryReply, `expected 451 retry on processing failure, transcript: ${transcript.join(' | ')}`).to.exist;

    await new Promise((r) => setTimeout(r, 250));

    sinon.assert.calledOnce(logReceivedStub);
    sinon.assert.calledOnce(logProcessingFailedStub);
    const failedContext = logProcessingFailedStub.getCall(0).args[0];
    expect(failedContext.requestLogId).to.equal('req_test_123');
    expect(failedContext.message).to.contain('Simulated parse failure');
    sinon.assert.notCalled(logQueuedStub);
    sinon.assert.notCalled(logQueueFailedStub);

    readFileStub.restore();
  });

  it('writes a request_failed trace when the queue insert fails', async () => {
    queueAddStub = sinon.stub(InboundParseQueueService.prototype, 'add').rejects(new Error('Simulated queue failure'));

    await sendInboundMessage();
    await new Promise((r) => setTimeout(r, 250));

    sinon.assert.calledOnce(logReceivedStub);
    sinon.assert.calledOnce(logQueueFailedStub);
    const failedContext = logQueueFailedStub.getCall(0).args[0];
    expect(failedContext.requestLogId).to.equal('req_test_123');
    expect(failedContext.message).to.contain('Simulated queue failure');
    sinon.assert.notCalled(logQueuedStub);
  });

  it('continues processing when the request logger throws', async () => {
    logReceivedStub.rejects(new Error('clickhouse down'));
    queueAddStub = sinon.stub(InboundParseQueueService.prototype, 'add').resolves(undefined as never);

    const transcript = await sendInboundMessage();
    const acceptedReply = transcript.find((line) => line.startsWith('250 ') && line.toLowerCase().includes('queued'));
    expect(acceptedReply, `expected 250 OK even when analytics fail, transcript: ${transcript.join(' | ')}`).to.exist;

    sinon.assert.calledOnce(queueAddStub);
    const enqueueCallArg = queueAddStub.getCall(0).args[0];
    // requestLogId is not propagated when logReceived throws or returns null
    expect(enqueueCallArg.data.requestLogId).to.be.undefined;
  });
});
