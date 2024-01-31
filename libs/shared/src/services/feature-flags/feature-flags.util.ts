export const prepareBooleanStringFeatureFlag = (value: string | undefined, defaultValue: boolean) => {
  if (!value) {
    return defaultValue;
  }

  return value === 'true';
};
