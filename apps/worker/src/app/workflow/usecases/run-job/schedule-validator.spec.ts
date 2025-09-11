import { Schedule } from '@novu/shared';
import { expect } from 'chai';
import { isWithinSchedule } from './schedule-validator';

describe('ScheduleValidator', () => {
  describe('isWithinSchedule', () => {
    it('should return true when no schedule is configured', () => {
      expect(isWithinSchedule(undefined)).to.be.true;
      expect(isWithinSchedule({ isEnabled: false })).to.be.true;
      expect(isWithinSchedule({ isEnabled: true, weeklySchedule: undefined })).to.be.true;
    });

    it('should handle timezone conversion correctly', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      // Test with UTC time (Monday 10:00 AM UTC)
      const utcTime = new Date('2024-01-01T10:00:00Z');
      expect(isWithinSchedule(schedule, utcTime)).to.be.true;

      // Test with timezone conversion (UTC to EST - should be 5:00 AM EST, outside schedule)
      const estTimezone = 'America/New_York';
      expect(isWithinSchedule(schedule, utcTime, estTimezone)).to.be.false;

      // Test with timezone conversion (UTC to PST - should be 2:00 AM PST, outside schedule)
      const pstTimezone = 'America/Los_Angeles';
      expect(isWithinSchedule(schedule, utcTime, pstTimezone)).to.be.false;

      // Test with timezone conversion (UTC to PST - should be 12:00 AM Poland, in the schedule)
      const polandTimezone = 'Europe/Warsaw';
      expect(isWithinSchedule(schedule, utcTime, polandTimezone)).to.be.true;

      // Test with a time that would be within schedule in EST (Monday 2:00 PM EST = Monday 7:00 PM UTC)
      const utcTimeAfternoon = new Date('2024-01-01T19:00:00Z');
      expect(isWithinSchedule(schedule, utcTimeAfternoon, estTimezone)).to.be.true;
    });

    it('should return false when schedule is enabled but day is disabled', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: false,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      // Test on a Monday
      const monday = new Date('2024-01-01T10:00:00Z'); // Monday 10:00 AM UTC
      expect(isWithinSchedule(schedule, monday)).to.be.false;
    });

    it('should return true when current time is within schedule', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      // Test on a Monday at 10:00 AM
      const monday = new Date('2024-01-01T10:00:00Z'); // Monday 10:00 AM UTC
      expect(isWithinSchedule(schedule, monday)).to.be.true;
    });

    it('should return false when current time is outside schedule', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      // Test on a Monday at 8:00 AM (before schedule)
      const mondayEarly = new Date('2024-01-01T08:59:59Z'); // Monday 8:59:59 AM UTC
      expect(isWithinSchedule(schedule, mondayEarly)).to.be.false;

      // Test on a Monday at 6:00 PM (after schedule)
      const mondayLate = new Date('2024-01-01T17:01:00Z'); // Monday 5:01:00 PM UTC
      expect(isWithinSchedule(schedule, mondayLate)).to.be.false;
    });

    it('should handle overnight schedules', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '11:00 PM', end: '02:00 AM' }],
          },
        },
      };

      // Test at 11:30 PM (within overnight schedule)
      const mondayNight = new Date('2024-01-01T23:30:00Z'); // Monday 11:30 PM UTC
      expect(isWithinSchedule(schedule, mondayNight)).to.be.true;

      // Test at 1:00 AM next day (within overnight schedule)
      const tuesdayEarly1 = new Date('2024-01-02T01:00:00Z'); // Tuesday 1:00 AM UTC
      expect(isWithinSchedule(schedule, tuesdayEarly1)).to.be.true;

      // Test at 1:00 AM next day (within overnight schedule)
      const tuesdayEarly2 = new Date('2024-01-02T01:00:00Z'); // Tuesday 3:00 AM Europe/Warsaw
      expect(isWithinSchedule(schedule, tuesdayEarly2, 'Europe/Warsaw')).to.be.true;

      // Test at 3:00 AM (outside overnight schedule)
      const tuesdayLate = new Date('2024-01-02T03:00:00Z'); // Tuesday 3:00 AM UTC
      expect(isWithinSchedule(schedule, tuesdayLate)).to.be.false;
    });

    it('should return false when no hours are configured for the day', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [],
          },
        },
      };

      const monday = new Date('2024-01-01T10:00:00Z'); // Monday 10:00 AM UTC
      expect(isWithinSchedule(schedule, monday)).to.be.false;
    });

    it('should handle multiple time ranges in a day', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [
              { start: '09:00 AM', end: '12:00 PM' },
              { start: '01:00 PM', end: '05:00 PM' },
            ],
          },
        },
      };

      // Test within first range
      const mondayMorning = new Date('2024-01-01T10:00:00Z'); // Monday 10:00 AM UTC
      expect(isWithinSchedule(schedule, mondayMorning)).to.be.true;

      // Test within second range
      const mondayAfternoon = new Date('2024-01-01T15:00:00Z'); // Monday 3:00 PM UTC
      expect(isWithinSchedule(schedule, mondayAfternoon)).to.be.true;

      // Test between ranges (lunch break)
      const mondayLunch = new Date('2024-01-01T12:30:00Z'); // Monday 12:30 PM UTC
      expect(isWithinSchedule(schedule, mondayLunch)).to.be.false;
    });

    it('should handle different days of the week', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          tuesday: {
            isEnabled: false,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          wednesday: {
            isEnabled: true,
            hours: [{ start: '10:00 AM', end: '04:00 PM' }],
          },
        },
      };

      // Monday - should be within schedule
      const monday = new Date('2024-01-01T10:00:00Z'); // Monday 10:00 AM UTC
      expect(isWithinSchedule(schedule, monday)).to.be.true;

      // Tuesday - should be outside schedule (day disabled)
      const tuesday = new Date('2024-01-02T10:00:00Z'); // Tuesday 10:00 AM UTC
      expect(isWithinSchedule(schedule, tuesday)).to.be.false;

      // Wednesday - should be within schedule
      const wednesday = new Date('2024-01-03T10:00:00Z'); // Wednesday 10:00 AM UTC
      expect(isWithinSchedule(schedule, wednesday)).to.be.true;

      // Wednesday - should be outside schedule (different hours)
      const wednesdayEarly = new Date('2024-01-03T09:00:00Z'); // Wednesday 9:00 AM UTC
      expect(isWithinSchedule(schedule, wednesdayEarly)).to.be.false;
    });

    it('should handle edge cases for time conversion', () => {
      const schedule: Schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '12:00 PM', end: '01:00 PM' }],
          },
        },
      };

      // Test exactly at start time
      const mondayNoon = new Date('2024-01-01T12:00:00Z'); // Monday 12:00 PM UTC
      expect(isWithinSchedule(schedule, mondayNoon)).to.be.true;

      // Test exactly at end time
      const mondayOne = new Date('2024-01-01T13:00:00Z'); // Monday 1:00 PM UTC
      expect(isWithinSchedule(schedule, mondayOne)).to.be.true;

      // Test just before start time
      const mondayBefore = new Date('2024-01-01T11:59:00Z'); // Monday 11:59 AM UTC
      expect(isWithinSchedule(schedule, mondayBefore)).to.be.false;

      // Test just after end time
      const mondayAfter = new Date('2024-01-01T13:01:00Z'); // Monday 1:01 PM UTC
      expect(isWithinSchedule(schedule, mondayAfter)).to.be.false;
    });
  });
});
