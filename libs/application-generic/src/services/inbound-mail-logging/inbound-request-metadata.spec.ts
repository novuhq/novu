import {
  buildEnvelopeRequestSource,
  buildInboundRequestMetadata,
  InboundRequestSource,
  inferInboundParseStrategy,
  parseReplyToAddress,
} from './inbound-request-metadata';

describe('inbound-request-metadata', () => {
  describe('inferInboundParseStrategy', () => {
    it('returns reply-to when the local-part encodes an environmentId', () => {
      expect(inferInboundParseStrategy('parse+txn-nv-e=env_1@reply.novu.co')).toBe('reply-to');
    });

    it('returns domain-route for plain addresses', () => {
      expect(inferInboundParseStrategy('support@customer.com')).toBe('domain-route');
    });
  });

  describe('parseReplyToAddress', () => {
    it('splits valid reply-to addresses', () => {
      expect(parseReplyToAddress('parse+txn-nv-e=env_1@reply.novu.co')).toEqual({
        domain: 'reply.novu.co',
        transactionId: 'txn',
        environmentId: 'env_1',
      });
    });

    it('returns null for plain domain-route addresses', () => {
      expect(parseReplyToAddress('support@customer.com')).toBeNull();
    });

    it('returns null when the metadata segment is missing', () => {
      expect(parseReplyToAddress('parse@reply.novu.co')).toBeNull();
    });

    it('returns null when environmentId is missing', () => {
      expect(parseReplyToAddress('parse+txn@reply.novu.co')).toBeNull();
    });
  });

  describe('buildEnvelopeRequestSource', () => {
    it('maps SMTP envelope addresses before the message is parsed', () => {
      const source = buildEnvelopeRequestSource(
        {
          mailFrom: { address: 'sender@example.com' },
          rcptTo: [{ address: 'support@customer.com' }],
        },
        { remoteAddress: '203.0.113.5', clientHostname: 'mta.example.com' } as InboundRequestSource['connection']
      );

      expect(source.from).toEqual([{ address: 'sender@example.com', name: '' }]);
      expect(source.to).toEqual([{ address: 'support@customer.com', name: '' }]);
      expect(source.connection).toEqual({ remoteAddress: '203.0.113.5', clientHostname: 'mta.example.com' });
      expect(source.subject).toBeUndefined();
      expect(source.messageId).toBeUndefined();
    });
  });

  describe('buildInboundRequestMetadata', () => {
    it('omits raw html / text and includes only routing metadata', () => {
      const json = buildInboundRequestMetadata({
        subject: 'Hello',
        messageId: 'msg-1',
        from: [{ address: 'sender@example.com', name: 'Sender' }],
        to: [{ address: 'parse@example.com', name: '' }],
        dkim: 'pass',
        spf: 'pass',
        spamScore: 1.5,
        attachments: [{ filename: 'a.pdf', contentType: 'application/pdf', size: 10 }],
        connection: {} as any,
      });

      const metadata = JSON.parse(json);
      expect(metadata.subject).toBe('Hello');
      expect(metadata.from).toEqual(['sender@example.com']);
      expect(metadata.to).toEqual(['parse@example.com']);
      expect(metadata.dkim).toBe('pass');
      expect(metadata.spamScore).toBe(1.5);
      expect(metadata.attachments).toEqual([{ filename: 'a.pdf', contentType: 'application/pdf', size: 10 }]);
      expect(metadata.html).toBeUndefined();
      expect(metadata.text).toBeUndefined();
    });
  });
});
