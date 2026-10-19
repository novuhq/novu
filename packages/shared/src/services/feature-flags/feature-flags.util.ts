export const prepareBooleanStringFeatureFlag = (value: string | undefined, defaultValue: boolean) => {
  if (!value) {
    return defaultValue;
  }

  return value === 'true';
};

export const prepareNumberStringFeatureFlag = (
  value: string | undefined,
  defaultValue: number | undefined
): number | undefined => {
  if (value) {
    return parseInt(value, 10);
  }

  return defaultValue;
};
