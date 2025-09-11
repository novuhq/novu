import { Schedule, TimeRange } from '@novu/shared';
import { toZonedTime } from 'date-fns-tz';

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
  const subscriberTime = timezone ? toZonedTime(currentTime, timezone) : currentTime;

  const currentDay = getDayOfWeek(subscriberTime);
  const currentTimeString = formatTime(subscriberTime);

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
function getDayOfWeek(date: Date): keyof NonNullable<Schedule['weeklySchedule']> {
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
function formatTime(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

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
