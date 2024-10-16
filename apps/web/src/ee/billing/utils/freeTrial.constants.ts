export const COLOR_WARNING = '#FDE044';

export const WARNING_LIMIT_DAYS = 3;

export const pluralizeDaysLeft = (numberOfDays: number) => {
  return `${numberOfDays} day${numberOfDays > 1 ? 's' : ''}`;
};
