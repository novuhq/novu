export class DurationUtils {
  static isISO8601(value: string): boolean {
    const iso8601Regex = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
    const match = iso8601Regex.exec(value);
    if (!match) {
      return false;
    }

    // `new Date()` rolls impossible days over (2025-02-30 becomes March 2), so check the calendar date
    const [, year, month, day] = match.map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
      return false;
    }

    const date = new Date(value);

    return !Number.isNaN(date.getTime());
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
