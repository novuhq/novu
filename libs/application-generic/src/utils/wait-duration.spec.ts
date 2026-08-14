import { TimeUnitEnum } from '@novu/shared';
import { expect } from 'chai';
import { parseExpiresIn, resolveWaitDuration, waitDurationMs } from './wait-duration';

describe('wait-duration', () => {
  describe('waitDurationMs', () => {
    it('defaults to 24 hours', () => {
      expect(waitDurationMs()).to.equal(24 * 60 * 60 * 1000);
    });

    it('converts a regular amount and unit', () => {
      expect(waitDurationMs(30, TimeUnitEnum.MINUTES)).to.equal(30 * 60 * 1000);
    });
  });

  describe('parseExpiresIn', () => {
    it('parses hours, minutes, and days', () => {
      expect(parseExpiresIn('24h')).to.deep.equal({ amount: 24, unit: TimeUnitEnum.HOURS });
      expect(parseExpiresIn('30m')).to.deep.equal({ amount: 30, unit: TimeUnitEnum.MINUTES });
      expect(parseExpiresIn('7d')).to.deep.equal({ amount: 7, unit: TimeUnitEnum.DAYS });
    });

    it('returns null for invalid values', () => {
      expect(parseExpiresIn('nope')).to.equal(null);
      expect(parseExpiresIn('0h')).to.equal(null);
    });
  });

  describe('resolveWaitDuration', () => {
    it('prefers expiresIn when valid', () => {
      expect(resolveWaitDuration({ expiresIn: '1h', amount: 5, unit: TimeUnitEnum.MINUTES })).to.equal(60 * 60 * 1000);
    });

    it('falls back to amount and unit', () => {
      expect(resolveWaitDuration({ amount: 2, unit: TimeUnitEnum.HOURS })).to.equal(2 * 60 * 60 * 1000);
    });

    it('falls back to the 24h default when expiresIn is invalid', () => {
      expect(resolveWaitDuration({ expiresIn: 'bad' })).to.equal(24 * 60 * 60 * 1000);
    });
  });
});
