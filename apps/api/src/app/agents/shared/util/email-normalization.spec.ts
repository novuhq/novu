import { expect } from 'chai';
import { isValidEmailForLookup, normalizeEmailForLookup } from './email-normalization';

describe('email-normalization', () => {
  describe('normalizeEmailForLookup', () => {
    it('should trim and lowercase', () => {
      expect(normalizeEmailForLookup('  User@Example.com  ')).to.equal('user@example.com');
    });
  });

  describe('isValidEmailForLookup', () => {
    it('should accept a simple email', () => {
      expect(isValidEmailForLookup('user@example.com')).to.equal(true);
    });

    it('should reject values without a domain', () => {
      expect(isValidEmailForLookup('user@')).to.equal(false);
      expect(isValidEmailForLookup('not-an-email')).to.equal(false);
    });
  });
});
