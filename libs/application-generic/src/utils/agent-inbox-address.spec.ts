import {
  agentInboxHandleCandidates,
  agentInboxIdentitySuffix,
  firstFreeAgentInboxHandle,
  isReservedAgentInboxHandle,
  preferredAgentInboxHandle,
} from './agent-inbox-address';

describe('agent inbox address', () => {
  describe('agentInboxIdentitySuffix', () => {
    it('uses the company from a work email', () => {
      expect(agentInboxIdentitySuffix('ada@acme.co')).toBe('acme');
    });

    it('uses the mailbox name for a shared provider', () => {
      expect(agentInboxIdentitySuffix('ada.lovelace@gmail.com')).toBe('ada');
    });

    it('falls back to hq when nothing usable is known', () => {
      expect(agentInboxIdentitySuffix(null)).toBe('hq');
      expect(agentInboxIdentitySuffix('')).toBe('hq');
    });
  });

  describe('preferredAgentInboxHandle', () => {
    it('slugifies a display name', () => {
      expect(preferredAgentInboxHandle('Atlas Prime')).toBe('atlas-prime');
    });

    it('is missing when the name has no letters an address can hold', () => {
      expect(preferredAgentInboxHandle('***')).toBeUndefined();
      expect(preferredAgentInboxHandle('')).toBeUndefined();
    });
  });

  describe('reserved handles', () => {
    it('holds back the public names and the mail-domain names', () => {
      expect(isReservedAgentInboxHandle('admin')).toBe(true);
      expect(isReservedAgentInboxHandle('postmaster')).toBe(true);
      expect(isReservedAgentInboxHandle('abuse')).toBe(true);
      expect(isReservedAgentInboxHandle('atlas')).toBe(false);
    });
  });

  describe('firstFreeAgentInboxHandle', () => {
    const taken = new Set(['atlas', 'atlas-acme']);

    it('offers the identity suffix, then numbers, when the handle is taken', () => {
      expect(firstFreeAgentInboxHandle('atlas', 'ada@acme.co', (handle) => taken.has(handle), 'nearby')).toBe(
        'atlas-acme-2'
      );
    });

    it('starts at the identity suffix itself when the name slugifies to nothing', () => {
      expect(firstFreeAgentInboxHandle('acme', 'ada@acme.co', () => false, 'number')).toBe('acme');
    });

    it('numbers the identity suffix when that handle is taken', () => {
      expect(firstFreeAgentInboxHandle('acme', 'ada@acme.co', (handle) => handle === 'acme', 'number')).toBe('acme-2');
    });

    it('keeps a free nearby handle', () => {
      expect(agentInboxHandleCandidates('atlas', 'ada@gmail.com', 'nearby')[0]).toBe('atlas-ada');
    });
  });
});
