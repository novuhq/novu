export const pluralizeTime = (amount: string | number, unit: 'minute' | 'hour' | 'day' | 'week' | 'month'): string =>
  amount === '1' || amount === '' || amount === 1 ? unit : `${amount} ${unit}s`;
