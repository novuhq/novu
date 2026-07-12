import { expect } from 'chai';
import { getPhoneLookupCandidates, normalizePhoneForMeta, toCanonicalE164Phone } from './phone-normalization';

describe('phone-normalization', () => {
  describe('toCanonicalE164Phone', () => {
    it('accepts Meta-style digits-only phones', () => {
      expect(toCanonicalE164Phone('15551234567')).to.equal('+15551234567');
    });

    it('accepts already-canonical E.164', () => {
      expect(toCanonicalE164Phone('+15551234567')).to.equal('+15551234567');
    });

    it('strips spaces and dashes before validating', () => {
      expect(toCanonicalE164Phone('+1 555-123-4567')).to.equal('+15551234567');
      expect(toCanonicalE164Phone('1 (555) 123-4567')).to.equal('+15551234567');
    });

    it('returns null for empty or unparseable values', () => {
      expect(toCanonicalE164Phone('')).to.equal(null);
      expect(toCanonicalE164Phone('   ')).to.equal(null);
      expect(toCanonicalE164Phone('not-a-phone')).to.equal(null);
      expect(toCanonicalE164Phone('+0123')).to.equal(null);
    });
  });

  describe('normalizePhoneForMeta / getPhoneLookupCandidates', () => {
    it('returns digit-only Meta form', () => {
      expect(normalizePhoneForMeta('+1 555-123-4567')).to.equal('15551234567');
    });

    it('builds plus and digits-only lookup candidates from formatted input', () => {
      expect(getPhoneLookupCandidates('+1 555-123-4567')).to.deep.equal(['+15551234567', '15551234567']);
    });
  });
});
