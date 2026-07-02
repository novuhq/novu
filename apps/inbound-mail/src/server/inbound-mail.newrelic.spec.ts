import net from 'node:net';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

const newrelic = require('newrelic');

import mailinServer from './index';

describe('Inbound Mail New Relic instrumentation', () => {
  let startBackgroundTransactionStub: sinon.SinonSpy;
  let startSegmentStub: sinon.SinonSpy;
  let addCustomAttributesStub: sinon.SinonSpy;

  before(async () => {
    startBackgroundTransactionStub = sinon.spy(newrelic, 'startBackgroundTransaction');
    startSegmentStub = sinon.spy(newrelic, 'startSegment');
    addCustomAttributesStub = sinon.spy(newrelic, 'addCustomAttributes');

    const port = (mailinServer as unknown as { configuration: { port: number; host: string } }).configuration.port;
    const host = (mailinServer as unknown as { configuration: { port: number; host: string } }).configuration.host;
    await waitForPort(host, port, 10_000);
  });

  after(() => {
    startBackgroundTransactionStub.restore();
    startSegmentStub.restore();
    addCustomAttributesStub.restore();
  });

  it('should wrap the inbound mail processing pipeline in a custom New Relic background transaction', async () => {
    const port = (mailinServer as unknown as { configuration: { port: number; host: string } }).configuration.port;
    const host = (mailinServer as unknown as { configuration: { port: number; host: string } }).configuration.host;

    await sendSmtpMessage({
      host,
      port,
      from: 'tracer@example.com',
      to: 'parse+abc-nv-e=env-nr-test@reply.novu.co',
      subject: 'NewRelic transaction smoke test',
      body: 'verifying the inbound mail New Relic instrumentation',
    });

    await waitFor(
      () =>
        startBackgroundTransactionStub
          .getCalls()
          .some((call) => call.args[0] === ObservabilityBackgroundTransactionEnum.INBOUND_MAIL_PROCESSING) &&
        startSegmentStub.getCalls().some((call) => call.args[0] === 'inbound-mail/unlink-file'),
      10_000
    );

    const txCall = startBackgroundTransactionStub
      .getCalls()
      .find((call) => call.args[0] === ObservabilityBackgroundTransactionEnum.INBOUND_MAIL_PROCESSING);

    expect(txCall, 'expected inbound-mail background transaction to be started').to.exist;
    expect(txCall!.args[1]).to.equal('Inbound Mail');
    expect(txCall!.args[2]).to.be.a('function');

    const segmentNames = startSegmentStub.getCalls().map((call) => call.args[0]);
    expect(segmentNames).to.include('inbound-mail/retrieve-raw-email');
    expect(segmentNames).to.include('inbound-mail/validate-dkim');
    expect(segmentNames).to.include('inbound-mail/validate-spf');
    expect(segmentNames).to.include('inbound-mail/compute-spam-score');
    expect(segmentNames).to.include('inbound-mail/parse-email');
    expect(segmentNames).to.include('inbound-mail/detect-language');
    expect(segmentNames).to.include('inbound-mail/post-queue');
    expect(segmentNames).to.include('inbound-mail/unlink-file');

    const allAttributeKeys = new Set<string>();
    for (const call of addCustomAttributesStub.getCalls()) {
      const payload = call.args[0] as Record<string, unknown> | undefined;
      if (!payload) continue;
      for (const key of Object.keys(payload)) {
        allAttributeKeys.add(key);
      }
    }

    expect(allAttributeKeys, 'expected non-PII connection attribute to be attached').to.include('mail.connectionId');
    expect(allAttributeKeys, 'expected envelope recipient count attribute to be attached').to.include(
      'mail.envelopeRecipientCount'
    );
    expect(allAttributeKeys, 'expected DKIM result attribute to be attached').to.include('mail.dkim');
    expect(allAttributeKeys, 'expected SPF result attribute to be attached').to.include('mail.spf');
    expect(allAttributeKeys, 'expected spam score attribute to be attached').to.include('mail.spamScore');
    expect(allAttributeKeys, 'expected queue route type attribute to be attached').to.include('mail.queue.routeType');

    const piiKeys = ['mail.from', 'mail.to', 'mail.remoteAddress', 'mail.clientHostname', 'mail.messageId'];
    for (const piiKey of piiKeys) {
      expect(allAttributeKeys, `did not expect PII attribute ${piiKey} to be attached`).to.not.include(piiKey);
    }
  });
});

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

async function waitForPort(host: string, port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const isListening = await new Promise<boolean>((resolve) => {
      const probe = net.createConnection({ host, port });
      probe.once('connect', () => {
        probe.destroy();
        resolve(true);
      });
      probe.once('error', () => {
        probe.destroy();
        resolve(false);
      });
    });
    if (isListening) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`SMTP server did not start listening on ${host}:${port} within ${timeoutMs}ms`);
}

interface SmtpMessage {
  host: string;
  port: number;
  from: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * Minimal SMTP client used to send a single message to the mailin SMTPServer
 * without pulling in a runtime dependency. Implements just enough of RFC 5321
 * to negotiate EHLO → MAIL FROM → RCPT TO → DATA → QUIT.
 */
async function sendSmtpMessage(msg: SmtpMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: msg.host, port: msg.port });
    const queue: Array<{ command: string; expect: number }> = [
      { command: `EHLO inbound-mail-test\r\n`, expect: 250 },
      { command: `MAIL FROM:<${msg.from}>\r\n`, expect: 250 },
      { command: `RCPT TO:<${msg.to}>\r\n`, expect: 250 },
      { command: `DATA\r\n`, expect: 354 },
      {
        command:
          `From: ${msg.from}\r\n` +
          `To: ${msg.to}\r\n` +
          `Subject: ${msg.subject}\r\n` +
          `Message-ID: <${Date.now()}@inbound-mail-test>\r\n` +
          `\r\n` +
          `${msg.body}\r\n` +
          `.\r\n`,
        expect: 250,
      },
      { command: `QUIT\r\n`, expect: 221 },
    ];

    let buffer = '';
    let waitingForGreeting = true;
    socket.setEncoding('utf8');

    const cleanup = (err?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    const sendNext = () => {
      const next = queue.shift();
      if (!next) {
        cleanup();
        return;
      }
      socket.write(next.command, (err) => {
        if (err) cleanup(err);
      });
      currentExpected = next.expect;
    };

    let currentExpected = 220;

    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.length < 4) continue;
        const code = Number.parseInt(line.slice(0, 3), 10);
        const isFinal = line[3] === ' ';
        if (!isFinal) continue;

        if (code !== currentExpected) {
          cleanup(new Error(`Unexpected SMTP response: ${line} (expected ${currentExpected})`));
          return;
        }

        if (waitingForGreeting) {
          waitingForGreeting = false;
        }

        sendNext();
      }
    });

    socket.on('error', cleanup);
    socket.on('end', () => {
      if (queue.length > 0) cleanup(new Error('SMTP connection closed before completion'));
    });
  });
}
