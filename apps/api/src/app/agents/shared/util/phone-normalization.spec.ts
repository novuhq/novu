import { expect } from 'chai';
import {
  buildPhoneDigitFlexibleRegexSource,
  getPhoneLookupCandidates,
  normalizePhoneForMeta,
  toCanonicalE164Phone,
} from './phone-normalization';

describe('phone-normalization', () => {
  describe('toCanonicalE164Phone', () => {
    it('accepts Meta style phones with digits and no plus', () => {
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
    it('returns Meta form with digits and no punctuation', () => {
      expect(normalizePhoneForMeta('+1 555-123-4567')).to.equal('15551234567');
    });

    it('builds plus and bare-digit lookup candidates from formatted input', () => {
      expect(getPhoneLookupCandidates('+1 555-123-4567')).to.deep.equal(['+15551234567', '15551234567']);
    });
  });

  describe('buildPhoneDigitFlexibleRegexSource', () => {
    it('matches formatted stored phones against Meta-style inbound digits', () => {
      const source = buildPhoneDigitFlexibleRegexSource('15551234567');

      expect(source).to.be.a('string');
      const pattern = new RegExp(source as string);

      expect(pattern.test('+15551234567')).to.equal(true);
      expect(pattern.test('15551234567')).to.equal(true);
      expect(pattern.test('+1 (555) 123-4567')).to.equal(true);
      expect(pattern.test('1-555-123-4567')).to.equal(true);
      expect(pattern.test('+15551234568')).to.equal(false);
      expect(pattern.test('+1 (555) 123-4568')).to.equal(false);
    });

    it('returns null when there are no digits', () => {
      expect(buildPhoneDigitFlexibleRegexSource('')).to.equal(null);
      expect(buildPhoneDigitFlexibleRegexSource('not-a-phone')).to.equal(null);
    });
  });
});
