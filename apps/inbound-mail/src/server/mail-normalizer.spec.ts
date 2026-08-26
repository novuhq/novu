import { expect } from 'chai';
import { simpleParser } from 'mailparser';

import { normalizeParsedMail } from './mail-normalizer';

/*
 * Pins the legacy (mailparser 0.6.x) wire contract that IInboundParseDataDto,
 * the worker strategies, and customer-facing webhooks depend on: string-only
 * header values, bracketless message-ids, flattened address arrays, and slim
 * Buffer attachments. Feeds real RFC 822 messages through mailparser 3's
 * simpleParser so the shim is exercised against actual parser output.
 */
describe('normalizeParsedMail', () => {
  async function parseAndNormalize(raw: string) {
    return normalizeParsedMail(await simpleParser(raw));
  }

  const plainTextEmail = [
    'From: Alice Sender <alice@example.com>',
    'To: Bob Receiver <bob@example.com>, carol@example.com',
    'Cc: Dave <dave@example.com>',
    'Subject: Hello world',
    'Date: Mon, 1 Jan 2024 10:00:00 +0000',
    'Message-ID: <msg-1@example.com>',
    'In-Reply-To: <parent@example.com>',
    'References: <root@example.com> <parent@example.com>',
    'X-Priority: 1 (Highest)',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Hi there',
    '',
  ].join('\r\n');

  it('flattens address fields to the legacy { address, name } array shape', async () => {
    const mail = await parseAndNormalize(plainTextEmail);

    expect(mail.from).to.deep.equal([{ address: 'alice@example.com', name: 'Alice Sender' }]);
    expect(mail.to).to.deep.equal([
      { address: 'bob@example.com', name: 'Bob Receiver' },
      { address: 'carol@example.com', name: '' },
    ]);
    expect(mail.cc).to.deep.equal([{ address: 'dave@example.com', name: 'Dave' }]);
    expect(mail.bcc).to.deep.equal([]);
  });

  it('converts every header value to plain strings matching the IHeaders contract', async () => {
    const mail = await parseAndNormalize(plainTextEmail);

    for (const value of Object.values(mail.headers)) {
      const entries = Array.isArray(value) ? value : [value];
      for (const entry of entries) {
        expect(entry).to.be.a('string');
      }
    }

    // mailparser@3 re-serializes display names with RFC 5322 quoting.
    expect(mail.headers.from).to.equal('"Alice Sender" <alice@example.com>');
    expect(mail.headers.to).to.equal('"Bob Receiver" <bob@example.com>, carol@example.com');
    expect(mail.headers.subject).to.equal('Hello world');
    expect(mail.headers['content-type']).to.equal('text/plain; charset=utf-8');
    // Raw header values keep RFC 5322 brackets, exactly as mailparser 0.6's parsedHeaders did.
    expect(mail.headers.references).to.equal('<root@example.com> <parent@example.com>');
  });

  it('strips RFC 5322 angle brackets from message ids like mailparser 0.6 did', async () => {
    const mail = await parseAndNormalize(plainTextEmail);

    expect(mail.messageId).to.equal('msg-1@example.com');
    expect(mail.inReplyTo).to.equal('parent@example.com');
    expect(mail.references).to.deep.equal(['root@example.com', 'parent@example.com']);
  });

  it('surfaces the parsed priority instead of defaulting to normal', async () => {
    const mail = await parseAndNormalize(plainTextEmail);

    expect(mail.priority).to.equal('high');
  });

  it('defaults priority to normal and threading fields to undefined when headers are absent', async () => {
    const mail = await parseAndNormalize(
      ['From: alice@example.com', 'To: bob@example.com', 'Subject: No threading', '', 'Body', ''].join('\r\n')
    );

    expect(mail.priority).to.equal('normal');
    expect(mail.inReplyTo).to.equal(undefined);
    expect(mail.references).to.equal(undefined);
  });

  it('normalizes attachments to the slim Buffer shape consumed by the uploader', async () => {
    const content = Buffer.from('hello attachment').toString('base64');
    const multipartEmail = [
      'From: alice@example.com',
      'To: bob@example.com',
      'Subject: With attachment',
      'Message-ID: <msg-2@example.com>',
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="boundary42"',
      '',
      '--boundary42',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'See attached',
      '--boundary42',
      'Content-Type: text/plain; name="hello.txt"',
      'Content-Disposition: attachment; filename="hello.txt"',
      'Content-Transfer-Encoding: base64',
      '',
      content,
      '--boundary42--',
      '',
    ].join('\r\n');

    const mail = await parseAndNormalize(multipartEmail);

    expect(mail.attachments).to.have.length(1);
    const [attachment] = mail.attachments;
    expect(Object.keys(attachment).sort()).to.deep.equal(['content', 'contentType', 'filename', 'size']);
    expect(attachment.filename).to.equal('hello.txt');
    expect(attachment.contentType).to.equal('text/plain');
    expect(Buffer.isBuffer(attachment.content)).to.equal(true);
    expect(attachment.content.toString()).to.equal('hello attachment');
    expect(attachment.size).to.be.greaterThan(0);
  });

  it('keeps html a string and leaves body fallbacks to the caller', async () => {
    const mail = await parseAndNormalize(plainTextEmail);

    expect(mail.html).to.equal('');
    expect(mail.text).to.equal('Hi there\n');
  });
});
