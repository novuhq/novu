import { ChannelTypeEnum, PreferredHours, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  calculateNextPreferredHoursTime,
  getChannelPreferredHoursPolicy,
  isPreferredHoursDeliveryAllowed,
  isValidPreferredHours,
  isWithinPreferredHours,
  shouldApplyPreferredHoursGate,
} from './preferred-hours-validator';

describe('PreferredHoursValidator', () => {
  describe('isWithinPreferredHours', () => {
    it('should return true when preferredHours is unset (no restriction)', () => {
      expect(isWithinPreferredHours(undefined)).to.be.true;
      expect(isWithinPreferredHours(null)).to.be.true;
      expect(isWithinPreferredHours({} as PreferredHours)).to.be.true;
      expect(isWithinPreferredHours({ start: '09:00' } as PreferredHours)).to.be.true;
      expect(isWithinPreferredHours({ start: '9am', end: '6pm' })).to.be.true;
    });

    it('should return true when current time is inside the window', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };
      const noonUtc = new Date('2024-01-01T12:00:00.000Z');

      expect(isWithinPreferredHours(preferredHours, noonUtc)).to.be.true;
    });

    it('should return false when current time is before the window', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };
      const early = new Date('2024-01-01T08:00:00.000Z');

      expect(isWithinPreferredHours(preferredHours, early)).to.be.false;
    });

    it('should return false when current time is after the window', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };
      const late = new Date('2024-01-01T19:00:00.000Z');

      expect(isWithinPreferredHours(preferredHours, late)).to.be.false;
    });

    it('should treat boundary times as inside the window', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };

      expect(isWithinPreferredHours(preferredHours, new Date('2024-01-01T09:00:00.000Z'))).to.be.true;
      expect(isWithinPreferredHours(preferredHours, new Date('2024-01-01T18:00:00.000Z'))).to.be.true;
    });

    it('should respect subscriber timezone', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };
      // 14:00 UTC = 09:00 America/New_York (EST, UTC-5) in January
      const utcAfternoon = new Date('2024-01-01T14:00:00.000Z');

      expect(isWithinPreferredHours(preferredHours, utcAfternoon, 'America/New_York')).to.be.true;

      // 13:00 UTC = 08:00 EST — outside
      const utcEarlier = new Date('2024-01-01T13:00:00.000Z');
      expect(isWithinPreferredHours(preferredHours, utcEarlier, 'America/New_York')).to.be.false;
    });

    it('should handle overnight windows', () => {
      const preferredHours: PreferredHours = { start: '22:00', end: '06:00' };

      expect(isWithinPreferredHours(preferredHours, new Date('2024-01-01T23:00:00.000Z'))).to.be.true;
      expect(isWithinPreferredHours(preferredHours, new Date('2024-01-01T03:00:00.000Z'))).to.be.true;
      expect(isWithinPreferredHours(preferredHours, new Date('2024-01-01T12:00:00.000Z'))).to.be.false;
    });

    it('should treat equal start and end as no restriction', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '09:00' };
      const early = new Date('2024-01-01T03:00:00.000Z');

      expect(isWithinPreferredHours(preferredHours, early)).to.be.true;
    });
  });

  describe('calculateNextPreferredHoursTime', () => {
    it('should return current time when preferredHours is unset', () => {
      const now = new Date('2024-01-01T10:00:00.000Z');
      expect(calculateNextPreferredHoursTime(undefined, now).getTime()).to.equal(now.getTime());
      expect(calculateNextPreferredHoursTime(null, now).getTime()).to.equal(now.getTime());
    });

    it('should return current time when already inside the window', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };
      const now = new Date('2024-01-01T12:00:00.000Z');

      expect(calculateNextPreferredHoursTime(preferredHours, now).getTime()).to.equal(now.getTime());
    });

    it('should return today start when before the window', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };
      const now = new Date('2024-01-01T07:30:00.000Z');
      const expected = new Date('2024-01-01T09:00:00.000Z');

      expect(calculateNextPreferredHoursTime(preferredHours, now).getTime()).to.equal(expected.getTime());
    });

    it('should return tomorrow start when after the window', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };
      const now = new Date('2024-01-01T19:00:00.000Z');
      const expected = new Date('2024-01-02T09:00:00.000Z');

      expect(calculateNextPreferredHoursTime(preferredHours, now).getTime()).to.equal(expected.getTime());
    });

    it('should calculate next open in a timezone when outside the window', () => {
      const preferredHours: PreferredHours = { start: '09:00', end: '18:00' };
      // 08:00 EST = 13:00 UTC
      const now = new Date('2024-01-01T13:00:00.000Z');
      // Next open: 09:00 EST = 14:00 UTC
      const expected = new Date('2024-01-01T14:00:00.000Z');

      expect(calculateNextPreferredHoursTime(preferredHours, now, 'America/New_York').getTime()).to.equal(
        expected.getTime()
      );
    });

    it('should calculate next open for overnight windows during the daytime gap', () => {
      const preferredHours: PreferredHours = { start: '22:00', end: '06:00' };
      const now = new Date('2024-01-01T12:00:00.000Z');
      const expected = new Date('2024-01-01T22:00:00.000Z');

      expect(calculateNextPreferredHoursTime(preferredHours, now).getTime()).to.equal(expected.getTime());
    });

    it('should return current time when inside an overnight window', () => {
      const preferredHours: PreferredHours = { start: '22:00', end: '06:00' };
      const now = new Date('2024-01-01T23:30:00.000Z');

      expect(calculateNextPreferredHoursTime(preferredHours, now).getTime()).to.equal(now.getTime());
    });
  });

  describe('isValidPreferredHours', () => {
    it('should accept valid HH:mm pairs', () => {
      expect(isValidPreferredHours({ start: '00:00', end: '23:59' })).to.be.true;
      expect(isValidPreferredHours({ start: '09:00', end: '18:00' })).to.be.true;
    });

    it('should reject invalid shapes from older/test data', () => {
      expect(isValidPreferredHours(undefined)).to.be.false;
      expect(isValidPreferredHours(null)).to.be.false;
      expect(isValidPreferredHours({ start: '9:00', end: '18:00' })).to.be.false;
      expect(isValidPreferredHours({ start: '09:00 AM', end: '06:00 PM' })).to.be.false;
      expect(isValidPreferredHours({ start: 9, end: 18 } as unknown as PreferredHours)).to.be.false;
      expect(isValidPreferredHours('09:00-18:00' as unknown as PreferredHours)).to.be.false;
    });
  });
});

  describe('channelOverrides', () => {
    const outsideWindow = new Date('2024-01-01T03:00:00.000Z'); // 03:00 UTC, outside 09–18
    const preferredHours: PreferredHours = {
      start: '09:00',
      end: '18:00',
      channelOverrides: {
        sms: 'always',
        email: 'respect',
      },
    };

    it('should allow SMS (always) outside the window', () => {
      expect(isPreferredHoursDeliveryAllowed(preferredHours, 'sms', outsideWindow)).to.be.true;
      expect(shouldApplyPreferredHoursGate(preferredHours, 'sms')).to.be.false;
    });

    it('should still gate email (respect) outside the window', () => {
      expect(isPreferredHoursDeliveryAllowed(preferredHours, 'email', outsideWindow)).to.be.false;
      expect(shouldApplyPreferredHoursGate(preferredHours, 'email')).to.be.true;
    });

    it('should default unset channels to respect', () => {
      expect(isPreferredHoursDeliveryAllowed(preferredHours, 'push', outsideWindow)).to.be.false;
      expect(getChannelPreferredHoursPolicy(preferredHours, ChannelTypeEnum.PUSH)).to.equal('respect');
    });

    it('should allow gated channels inside the window', () => {
      const noon = new Date('2024-01-01T12:00:00.000Z');
      expect(isPreferredHoursDeliveryAllowed(preferredHours, 'email', noon)).to.be.true;
    });

    it('should allow all channels when preferredHours is unset', () => {
      expect(isPreferredHoursDeliveryAllowed(undefined, 'email', outsideWindow)).to.be.true;
      expect(isPreferredHoursDeliveryAllowed(null, 'sms', outsideWindow)).to.be.true;
    });

    it('should map StepTypeEnum values to channel policies', () => {
      expect(isPreferredHoursDeliveryAllowed(preferredHours, StepTypeEnum.SMS, outsideWindow)).to.be.true;
      expect(isPreferredHoursDeliveryAllowed(preferredHours, StepTypeEnum.EMAIL, outsideWindow)).to.be.false;
    });

    it('should reject invalid channelOverrides in isValidPreferredHours', () => {
      expect(
        isValidPreferredHours({
          start: '09:00',
          end: '18:00',
          channelOverrides: { fax: 'always' } as never,
        })
      ).to.be.false;
      expect(
        isValidPreferredHours({
          start: '09:00',
          end: '18:00',
          channelOverrides: { sms: 'sometimes' as never },
        })
      ).to.be.false;
      expect(
        isValidPreferredHours({
          start: '09:00',
          end: '18:00',
          channelOverrides: { sms: 'always' },
        })
      ).to.be.true;
    });
  });
