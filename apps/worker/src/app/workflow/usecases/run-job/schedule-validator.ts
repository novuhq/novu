import { Schedule, TimeRange } from '@novu/shared';
import { addDays, isAfter, isBefore, isEqual, set } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

const DAYS_OF_WEEK: Array<keyof NonNullable<Schedule['weeklySchedule']>> = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export function isWithinSchedule(schedule?: Schedule, currentTime: Date = new Date(), timezone?: string): boolean {
  // If no schedule is configured, allow all messages
  if (!schedule || !schedule.isEnabled || !schedule.weeklySchedule) {
    return true;
  }

  // Convert current time to subscriber's timezone if provided
  const subscriberTime = timezone ? utcToZonedTime(currentTime, timezone) : currentTime;

  const currentDay = getDayOfWeek(subscriberTime);
  const currentTimeString = formatTime(subscriberTime, !!timezone);

  // Check both the current day and the previous day for overnight schedules
  const daysToCheck = [currentDay];

  // For overnight schedules, also check the previous day
  const previousDay = getPreviousDay(currentDay);
  if (previousDay) {
    const previousDaySchedule = schedule.weeklySchedule[previousDay];
    // Only check previous day if it has overnight schedules (end time < start time)
    if (previousDaySchedule?.isEnabled && previousDaySchedule.hours) {
      const hasOvernightSchedule = previousDaySchedule.hours.some((timeRange) => {
        const startInMinutes = timeToMinutes(timeRange.start);
        const endInMinutes = timeToMinutes(timeRange.end);
        return endInMinutes < startInMinutes;
      });

      if (hasOvernightSchedule) {
        daysToCheck.push(previousDay);
      }
    }
  }

  // Check if current time falls within any of the configured time ranges for any of the days
  const result = daysToCheck.some((day) => {
    const daySchedule = schedule.weeklySchedule?.[day];

    // If the day is not enabled, skip it
    if (!daySchedule || !daySchedule.isEnabled) {
      return false;
    }

    // If no hours are configured for the day, skip it
    if (!daySchedule.hours || daySchedule.hours.length === 0) {
      return false;
    }

    // Check if current time falls within any of the configured time ranges
    return daySchedule.hours.some((timeRange) => isTimeInRange(currentTimeString, timeRange));
  });

  return result;
}

/**
 * Gets the day of the week as a string key for the weekly schedule
 */
export function getDayOfWeek(date: Date): keyof NonNullable<Schedule['weeklySchedule']> {
  return DAYS_OF_WEEK[date.getUTCDay()];
}

/**
 * Gets the previous day of the week for overnight schedule checking
 */
function getPreviousDay(
  day: keyof NonNullable<Schedule['weeklySchedule']>
): keyof NonNullable<Schedule['weeklySchedule']> | null {
  const currentIndex = DAYS_OF_WEEK.indexOf(day);
  const previousIndex = (currentIndex - 1 + 7) % 7;
  return DAYS_OF_WEEK[previousIndex];
}

/**
 * Formats a Date object to the time format used in schedules (e.g., "09:00 AM")
 */
function formatTime(date: Date, hasTimezone = false): string {
  const hours = hasTimezone ? date.getHours() : date.getUTCHours();
  const minutes = hasTimezone ? date.getMinutes() : date.getUTCMinutes();

  const period = hours < 12 ? 'AM' : 'PM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const formattedHours = displayHours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes} ${period}`;
}

/**
 * Checks if a time string falls within a time range
 */
function isTimeInRange(time: string, range: TimeRange): boolean {
  const timeInMinutes = timeToMinutes(time);
  const startInMinutes = timeToMinutes(range.start);
  const endInMinutes = timeToMinutes(range.end);

  // Handle cases where the end time is the next day (e.g., 11:00 PM to 2:00 AM)
  if (endInMinutes < startInMinutes) {
    return timeInMinutes >= startInMinutes || timeInMinutes <= endInMinutes;
  }

  return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
}

/**
 * Converts a time string (e.g., "09:00 AM") to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const [time, period] = timeString.split(' ');
  const [hours, minutes] = time.split(':').map(Number);

  let totalMinutes = hours * 60 + minutes;

  if (period === 'PM' && hours !== 12) {
    totalMinutes += 12 * 60;
  } else if (period === 'AM' && hours === 12) {
    totalMinutes = minutes; // 12:XX AM should be XX minutes past midnight
  }

  return totalMinutes;
}

function isWithinRange(date: Date, start: Date, end: Date) {
  return (isAfter(date, start) || isEqual(date, start)) && (isBefore(date, end) || isEqual(date, end));
}

export function calculateNextAvailableTime(schedule?: Schedule, nowUtc = new Date(), timeZone?: string): Date {
  if (!schedule || !schedule.isEnabled) return nowUtc;

  // "working time" in chosen zone (or UTC if no tz)
  const nowWorking = timeZone ? utcToZonedTime(nowUtc, timeZone) : nowUtc;

  // start from yesterday to handle overnight schedules
  for (let dayOffset = -1; dayOffset <= 7; dayOffset++) {
    const candidateDay = addDays(nowWorking, dayOffset);
    const weekday = getDayOfWeek(candidateDay);

    const daySchedule = schedule.weeklySchedule?.[weekday];
    if (!daySchedule?.isEnabled || !daySchedule?.hours) {
      continue;
    }

    for (const { start, end } of daySchedule.hours) {
      // get hours and minutes
      const startTime = parseTimeString(start);
      const endTime = parseTimeString(end);

      const startZoned = timeZone
        ? set(candidateDay, {
            hours: startTime.hours,
            minutes: startTime.minutes,
            seconds: 0,
            milliseconds: 0,
          })
        : new Date(
            Date.UTC(
              candidateDay.getUTCFullYear(),
              candidateDay.getUTCMonth(),
              candidateDay.getUTCDate(),
              startTime.hours,
              startTime.minutes,
              0,
              0
            )
          );

      let endZoned = timeZone
        ? set(candidateDay, {
            hours: endTime.hours,
            minutes: endTime.minutes,
            seconds: 0,
            milliseconds: 0,
          })
        : new Date(
            Date.UTC(
              candidateDay.getUTCFullYear(),
              candidateDay.getUTCMonth(),
              candidateDay.getUTCDate(),
              endTime.hours,
              endTime.minutes,
              0,
              0
            )
          );

      // handle overnight ranges (if end is before start, push to next day)
      if (isBefore(endZoned, startZoned)) {
        endZoned = addDays(endZoned, 1);
      }

      // if overnight day, and we are within the slot, return current time
      if (dayOffset <= 0 && isWithinRange(nowWorking, startZoned, endZoned)) {
        return nowUtc;
      }

      // if next day after current day, or start is after current time, return start time
      if (dayOffset > 0 || isAfter(startZoned, nowWorking)) {
        return timeZone
          ? zonedTimeToUtc(startZoned, timeZone)
          : new Date(
              Date.UTC(
                startZoned.getUTCFullYear(),
                startZoned.getUTCMonth(),
                startZoned.getUTCDate(),
                startZoned.getUTCHours(),
                startZoned.getUTCMinutes(),
                0,
                0
              )
            );
      }
    }
  }

  return nowUtc;
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);

  let adjustedHours = hours;
  if (period === 'PM' && hours !== 12) {
    adjustedHours += 12;
  } else if (period === 'AM' && hours === 12) {
    adjustedHours = 0;
  }

  return { hours: adjustedHours, minutes };
}
