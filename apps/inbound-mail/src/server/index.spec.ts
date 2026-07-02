import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { InboundParseQueueService } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';

import mailinServer from './index';

/*
 * Validates the data-loss fix in apps/inbound-mail/src/server/index.ts.
 *
 * Before the fix the SMTP DATA handler returned 250 OK to the client without
 * awaiting the queue insert. If `inboundParseQueueService.add` rejected, the
 * sender had already been told the message was accepted — silent loss.
 *
 * The fix awaits the entire `dataReady` chain (including `postQueue`) and
 * propagates any failure to the SMTP layer with `responseCode: 451`, so the
 * sending MTA receives a transient failure and retries.
 */
describe('Mailin SMTP DATA handler — queue persistence', () => {
  const SMTP_HOST = '127.0.0.1';
  const SMTP_PORT = Number(process.env.PORT || 2525);

  function sendInboundMessage(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(SMTP_PORT, SMTP_HOST);
      const transcript: string[] = [];
      let buffer = '';

      const dataLines = [
        'From: <sender@example.com>',
        'To: <support@customer.com>',
        'Subject: Test inbound mail',
        'Message-ID: <test-message-id@example.com>',
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

  function findPostDataReply(transcript: string[]): string | undefined {
    const dataIdx = transcript.findIndex((line) => /^354[ -]/.test(line));
    if (dataIdx === -1) return undefined;
    for (let i = dataIdx + 1; i < transcript.length; i += 1) {
      if (/^\d{3} /.test(transcript[i])) return transcript[i];
    }

    return undefined;
  }

  before(async function before() {
    this.timeout(30_000);
    // main.ts auto-starts the SMTP server, but `start()` is async (Redis
    // init). Wait for the listener to come up before driving test traffic.
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      const smtp = (mailinServer as unknown as { _smtp: unknown })._smtp;
      if (smtp) {
        // Probe the port to ensure listen() has actually completed.
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

  afterEach(() => {
    sinon.restore();
  });

  /*
   * The Mailin server writes raw inbound emails into a tmp directory derived
   * from the configured `tmp` setting (default `.tmp`, relative to cwd at
   * server start time). After every test we sample the directory to assert
   * that no temp files leaked from a failed queue insert — a sustained queue
   * outage must not be amplifiable into a disk-exhaustion DoS.
   */
  const tmpDir = path.resolve(mailinServer.configuration.tmp);

  function listTmpFiles(): string[] {
    if (!fs.existsSync(tmpDir)) return [];

    return fs.readdirSync(tmpDir).filter((name) => !name.startsWith('.'));
  }

  it('returns SMTP 4xx (not 250) when the queue insert fails so the sender retries instead of dropping the message', async () => {
    sinon.stub(InboundParseQueueService.prototype, 'add').rejects(new Error('Simulated queue insert failure'));

    const before = new Set(listTmpFiles());
    const transcript = await sendInboundMessage();
    const postDataReply = findPostDataReply(transcript);

    expect(postDataReply, `transcript: ${transcript.join(' | ')}`).to.exist;
    const reply = postDataReply ?? '';
    const code = Number(reply.slice(0, 3));
    expect(code, `expected 4xx retry-eligible response, got: ${reply}`).to.be.gte(400).and.lt(500);
    expect(reply.startsWith('250 '), `unexpected 250 OK on queue failure: ${reply}`).to.equal(false);

    /*
     * Give the failure-path cleanup (best-effort unlink) a beat to run after
     * the SMTP transaction terminates. Then assert that no new temp file was
     * left behind. Without this assertion an attacker could repeatedly submit
     * messages during a queue outage and accumulate temp files until the disk
     * is full.
     */
    await new Promise((r) => setTimeout(r, 250));
    const after = listTmpFiles().filter((name) => !before.has(name));
    expect(after, `temp files leaked on queue-failure path: ${after.join(', ')}`).to.deep.equal([]);
  });

  it('returns SMTP 250 when the queue insert succeeds and cleans up the temp file', async () => {
    sinon.stub(InboundParseQueueService.prototype, 'add').resolves(undefined as never);

    const before = new Set(listTmpFiles());
    const transcript = await sendInboundMessage();
    const postDataReply = findPostDataReply(transcript);

    expect(postDataReply, `transcript: ${transcript.join(' | ')}`).to.exist;
    const reply = postDataReply ?? '';
    expect(reply.startsWith('250 '), `expected 250 OK, got: ${reply}`).to.equal(true);

    await new Promise((r) => setTimeout(r, 250));
    const after = listTmpFiles().filter((name) => !before.has(name));
    expect(after, `temp files leaked on success path: ${after.join(', ')}`).to.deep.equal([]);
  });
});
