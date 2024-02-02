/** Return value within inclusive bounds of min and max */
export const clamp = (value: number, min: number, max: number): number => {
  const verifiedMin = Math.min(min, max);
  const verifiedMax = Math.max(min, max);

  return Math.max(Math.min(value, verifiedMax), verifiedMin);
};
