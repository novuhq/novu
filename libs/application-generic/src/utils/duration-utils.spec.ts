import { DurationUtils } from './duration-utils';

describe('DurationUtils', () => {
  describe('isISO8601', () => {
    it('should validate correct ISO-8601 timestamps', () => {
      expect(DurationUtils.isISO8601('2025-01-01T12:00:00Z')).toBe(true);
      expect(DurationUtils.isISO8601('2025-12-31T23:59:59Z')).toBe(true);
      expect(DurationUtils.isISO8601('2025-06-15T08:30:00.123Z')).toBe(true);
      expect(DurationUtils.isISO8601('2025-06-15T08:30:00.12Z')).toBe(true);
      expect(DurationUtils.isISO8601('2025-06-15T08:30:00.1Z')).toBe(true);
      expect(DurationUtils.isISO8601('2025-06-15T08:30:00')).toBe(true);
    });

    it('should reject invalid ISO-8601 formats', () => {
      expect(DurationUtils.isISO8601('2025-01-01')).toBe(false);
      expect(DurationUtils.isISO8601('12:00:00')).toBe(false);
      expect(DurationUtils.isISO8601('invalid-date')).toBe(false);
      expect(DurationUtils.isISO8601('2025/01/01 12:00:00')).toBe(false);
      expect(DurationUtils.isISO8601('2025-13-01T12:00:00Z')).toBe(false);
      expect(DurationUtils.isISO8601('2025-01-32T12:00:00Z')).toBe(false);
    });

    it('should reject invalid dates with correct format', () => {
      expect(DurationUtils.isISO8601('2025-02-30T12:00:00Z')).toBe(false);
    });
  });

  describe('convertToMilliseconds', () => {
    it('should convert seconds to milliseconds', () => {
      expect(DurationUtils.convertToMilliseconds(5, 'seconds')).toBe(5000);
      expect(DurationUtils.convertToMilliseconds(1, 'seconds')).toBe(1000);
      expect(DurationUtils.convertToMilliseconds(60, 'seconds')).toBe(60000);
    });

    it('should convert minutes to milliseconds', () => {
      expect(DurationUtils.convertToMilliseconds(1, 'minutes')).toBe(60000);
      expect(DurationUtils.convertToMilliseconds(5, 'minutes')).toBe(300000);
      expect(DurationUtils.convertToMilliseconds(30, 'minutes')).toBe(1800000);
    });

    it('should convert hours to milliseconds', () => {
      expect(DurationUtils.convertToMilliseconds(1, 'hours')).toBe(3600000);
      expect(DurationUtils.convertToMilliseconds(2, 'hours')).toBe(7200000);
      expect(DurationUtils.convertToMilliseconds(24, 'hours')).toBe(86400000);
    });

    it('should convert days to milliseconds', () => {
      expect(DurationUtils.convertToMilliseconds(1, 'days')).toBe(86400000);
      expect(DurationUtils.convertToMilliseconds(7, 'days')).toBe(604800000);
    });

    it('should convert weeks to milliseconds', () => {
      expect(DurationUtils.convertToMilliseconds(1, 'weeks')).toBe(604800000);
      expect(DurationUtils.convertToMilliseconds(2, 'weeks')).toBe(1209600000);
    });

    it('should convert months to milliseconds', () => {
      expect(DurationUtils.convertToMilliseconds(1, 'months')).toBe(2592000000);
      expect(DurationUtils.convertToMilliseconds(3, 'months')).toBe(7776000000);
    });

    it('should throw error for invalid time unit', () => {
      expect(() => DurationUtils.convertToMilliseconds(5, 'invalid')).toThrow('Invalid time unit');
      expect(() => DurationUtils.convertToMilliseconds(5, 'years')).toThrow('Invalid time unit');
      expect(() => DurationUtils.convertToMilliseconds(5, '')).toThrow('Invalid time unit');
    });

    it('should handle decimal amounts correctly', () => {
      expect(DurationUtils.convertToMilliseconds(0.5, 'seconds')).toBe(500);
      expect(DurationUtils.convertToMilliseconds(1.5, 'minutes')).toBe(90000);
    });

    it('should handle zero amount', () => {
      expect(DurationUtils.convertToMilliseconds(0, 'seconds')).toBe(0);
      expect(DurationUtils.convertToMilliseconds(0, 'hours')).toBe(0);
    });
  });
});
