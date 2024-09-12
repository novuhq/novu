export const COLOR_WARNING = '#FDE044';

export const pluralizeDaysLeft = (numberOfDays: number) => {
  return `${numberOfDays} day${numberOfDays > 1 ? 's' : ''}`;
};

// make warningLimitDays return different values based on feature flag
export const warningLimitDays = (isImprovedBillingEnabled: boolean) => {
  return isImprovedBillingEnabled ? 3 : 10;
};
