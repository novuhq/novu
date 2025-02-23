/**
 * regular expression to check for valid hour format (01-23)
 */
export function isValidHour(value: string) {
  return /^(0[0-9]|1[0-9]|2[0-3])$/.test(value);
}

/**
 * regular expression to check for valid 12 hour format (01-12)
 */
export function isValid12Hour(value: string) {
  return /^(0[1-9]|1[0-2])$/.test(value);
}

/**
 * regular expression to check for valid minute format (00-59)
 */
export function isValidMinuteOrSecond(value: string) {
  return /^[0-5][0-9]$/.test(value);
}

type GetValidNumberConfig = { max: number; min?: number; loop?: boolean };

export function getValidNumber(value: string, { max, min = 0, loop = false }: GetValidNumberConfig) {
  let numericValue = parseInt(value, 10);

  if (!isNaN(numericValue)) {
    if (!loop) {
      if (numericValue > max) numericValue = max;
      if (numericValue < min) numericValue = min;
    } else {
      if (numericValue > max) numericValue = min;
      if (numericValue < min) numericValue = max;
    }

    return numericValue.toString().padStart(2, '0');
  }

  return '00';
}

export function getValidHour(value: string) {
  if (isValidHour(value)) return value;
  return getValidNumber(value, { max: 23 });
}

export function getValid12Hour(value: string) {
  if (isValid12Hour(value)) return value;
  return getValidNumber(value, { min: 1, max: 12 });
}

export function getValidMinuteOrSecond(value: string) {
  if (isValidMinuteOrSecond(value)) return value;
  return getValidNumber(value, { max: 59 });
}

type GetValidArrowNumberConfig = {
  min: number;
  max: number;
  step: number;
};

export function getValidArrowNumber(value: string, { min, max, step }: GetValidArrowNumberConfig) {
  let numericValue = parseInt(value, 10);

  if (!isNaN(numericValue)) {
    numericValue += step;
    return getValidNumber(String(numericValue), { min, max, loop: true });
  }

  return '00';
}

export function getValidArrowHour(value: string, step: number) {
  return getValidArrowNumber(value, { min: 0, max: 23, step });
}

export function getValidArrow12Hour(value: string, step: number) {
  return getValidArrowNumber(value, { min: 1, max: 12, step });
}

export function getValidArrowMinuteOrSecond(value: string, step: number) {
  return getValidArrowNumber(value, { min: 0, max: 59, step });
}

export function setMinutes(date: Date, value: string) {
  const minutes = getValidMinuteOrSecond(value);
  date.setMinutes(parseInt(minutes, 10));
  return date;
}

export function setSeconds(date: Date, value: string) {
  const seconds = getValidMinuteOrSecond(value);
  date.setSeconds(parseInt(seconds, 10));
  return date;
}

export function setHours(date: Date, value: string) {
  const hours = getValidHour(value);
  date.setHours(parseInt(hours, 10));
  return date;
}

export function set12Hours(date: Date, value: string, period: Period) {
  const hours = parseInt(getValid12Hour(value), 10);
  const convertedHours = convert12HourTo24Hour(hours, period);
  date.setHours(convertedHours);
  return date;
}

export type TimePickerType = 'minutes' | 'seconds' | 'hours' | '12hours';
export type Period = 'AM' | 'PM';

export function setDateByType(date: Date, value: string, type: TimePickerType, period?: Period) {
  switch (type) {
    case 'minutes':
      return setMinutes(date, value);
    case 'seconds':
      return setSeconds(date, value);
    case 'hours':
      return setHours(date, value);

    case '12hours': {
      if (!period) return date;
      return set12Hours(date, value, period);
    }

    default:
      return date;
  }
}

export function getDateByType(date: Date, type: TimePickerType) {
  switch (type) {
    case 'minutes':
      return getValidMinuteOrSecond(String(date.getMinutes()));
    case 'seconds':
      return getValidMinuteOrSecond(String(date.getSeconds()));
    case 'hours':
      return getValidHour(String(date.getHours()));
    case '12hours':
      return getValid12Hour(String(display12HourValue(date.getHours())));
    default:
      return '00';
  }
}

export function getArrowByType(value: string, step: number, type: TimePickerType) {
  switch (type) {
    case 'minutes':
      return getValidArrowMinuteOrSecond(value, step);
    case 'seconds':
      return getValidArrowMinuteOrSecond(value, step);
    case 'hours':
      return getValidArrowHour(value, step);
    case '12hours':
      return getValidArrow12Hour(value, step);
    default:
      return '00';
  }
}

/**
 * handles value change of 12-hour input
 * 12:00 PM is 12:00
 * 12:00 AM is 00:00
 */
export function convert12HourTo24Hour(hour: number, period: Period) {
  if (period === 'PM') {
    if (hour <= 11) {
      return hour + 12;
    } else {
      return hour;
    }
  } else if (period === 'AM') {
    if (hour === 12) return 0;
    return hour;
  }

  return hour;
}

/**
 * time is stored in the 24-hour form,
 * but needs to be displayed to the user
 * in its 12-hour representation
 */
export function display12HourValue(hours: number) {
  if (hours === 0 || hours === 12) return '12';
  if (hours >= 22) return `${hours - 12}`;
  if (hours % 12 > 9) return `${hours}`;
  return `0${hours % 12}`;
}
