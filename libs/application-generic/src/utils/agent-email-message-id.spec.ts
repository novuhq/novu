import { randomUUID } from 'node:crypto';
import { buildAgentEmailMessageId, parseAgentEmailMessageId } from './agent-email-message-id';

const MESSAGE_ID = '65f1a2b3c4d5e6f7a8b9c0d1';

describe('agent-email-message-id helpers', () => {
  describe('buildAgentEmailMessageId', () => {
    it('builds an angle-bracketed id on the sender domain', () => {
      expect(buildAgentEmailMessageId(MESSAGE_ID, 'support-ab12cd34@agentconnect.sh')).toBe(
        `<novu-${MESSAGE_ID}@agentconnect.sh>`
      );
    });

    it('lowercases the domain', () => {
      expect(buildAgentEmailMessageId(MESSAGE_ID, 'Agent@Example.COM')).toBe(`<novu-${MESSAGE_ID}@example.com>`);
    });

    it('falls back to novu.co for unusable sender domains', () => {
      const unusable = ['no-at-sign', 'agent@has underscore', 'agent@', 'agent@bad_domain.com'];

      for (const from of unusable) {
        expect(buildAgentEmailMessageId(MESSAGE_ID, from)).toBe(`<novu-${MESSAGE_ID}@novu.co>`);
      }
    });
  });

  describe('parseAgentEmailMessageId', () => {
    it('round-trips a built id', () => {
      const built = buildAgentEmailMessageId(MESSAGE_ID, 'agent@example.com');

      expect(parseAgentEmailMessageId(built)).toBe(MESSAGE_ID);
    });

    it('accepts an id without angle brackets and with surrounding whitespace', () => {
      expect(parseAgentEmailMessageId(`  novu-${MESSAGE_ID}@example.com  `)).toBe(MESSAGE_ID);
    });

    it('normalizes the ObjectId to lowercase hex', () => {
      expect(parseAgentEmailMessageId(`<novu-${MESSAGE_ID.toUpperCase()}@example.com>`)).toBe(MESSAGE_ID);
    });

    it('rejects ids that we did not mint', () => {
      const foreign = [
        `<${randomUUID()}@agentconnect.sh>`,
        '<CAJ1x0y2@mail.gmail.com>',
        '<010001900abc-1234@eu-west-1.amazonses.com>',
        'parse+txn-nv-e=env@inbound.example.com',
        '',
      ];

      for (const value of foreign) {
        expect(parseAgentEmailMessageId(value)).toBeNull();
      }
    });

    it('rejects malformed novu-prefixed ids', () => {
      const malformed = [
        `<novu-${MESSAGE_ID}>`,
        '<novu-notanobjectid@example.com>',
        '<novu-65f1a2b3c4d5e6f7a8b9c0@example.com>',
        `<novu-${MESSAGE_ID}zz@example.com>`,
        `<novu-${MESSAGE_ID}@>`,
        `<prefixnovu-${MESSAGE_ID}@example.com>`,
      ];

      for (const value of malformed) {
        expect(parseAgentEmailMessageId(value)).toBeNull();
      }
    });
  });
});
