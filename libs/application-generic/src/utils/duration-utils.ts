export class DurationUtils {
  static isISO8601(value: string): boolean {
    const iso8601Regex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z)?$/;

    const match = value.match(iso8601Regex);

    if (!match) {
      return false;
    }

    const [, year, month, day, hour, minute, second, , timezone] = match;
    const hourNumber = Number(hour);
    const minuteNumber = Number(minute);
    const secondNumber = Number(second);

    if (hourNumber === 24 && (minuteNumber !== 0 || secondNumber !== 0)) {
      return false;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const yearNumber = Number(year);
    const monthNumber = Number(month);
    const dayNumber = Number(day);

    const isUTC = timezone === 'Z';

    if (hourNumber === 24) {
      const nextDay = isUTC
        ? new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber + 1))
        : new Date(yearNumber, monthNumber - 1, dayNumber + 1);

      if (isUTC) {
        return (
          date.getUTCFullYear() === nextDay.getUTCFullYear() &&
          date.getUTCMonth() === nextDay.getUTCMonth() &&
          date.getUTCDate() === nextDay.getUTCDate()
        );
      }

      return (
        date.getFullYear() === nextDay.getFullYear() &&
        date.getMonth() === nextDay.getMonth() &&
        date.getDate() === nextDay.getDate()
      );
    }

    if (isUTC) {
      return (
        date.getUTCFullYear() === yearNumber &&
        date.getUTCMonth() + 1 === monthNumber &&
        date.getUTCDate() === dayNumber
      );
    }

    return date.getFullYear() === yearNumber && date.getMonth() + 1 === monthNumber && date.getDate() === dayNumber;
  }

  static convertToMilliseconds(amount: number, unit: string): number {
    const unitMap: Record<string, number> = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000,
    };

    if (!unitMap[unit]) {
      throw new Error(`Invalid time unit '${unit}'. Supported units: ${Object.keys(unitMap).join(', ')}`);
    }

    return amount * unitMap[unit];
  }
}
