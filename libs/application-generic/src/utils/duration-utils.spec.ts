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
      expect(DurationUtils.isISO8601('2025-01-01T00:30:00')).toBe(true);
    });

    it('should accept end-of-day timestamps', () => {
      expect(DurationUtils.isISO8601('2025-01-01T24:00:00Z')).toBe(true);
      expect(DurationUtils.isISO8601('2025-01-01T24:00:00')).toBe(true);
      expect(DurationUtils.isISO8601('2025-01-01T24:00:01Z')).toBe(false);
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
      expect(DurationUtils.isISO8601('2024-02-29T12:00:00Z')).toBe(true);
      expect(DurationUtils.isISO8601('2025-02-29T12:00:00Z')).toBe(false);
    });
  });
});
