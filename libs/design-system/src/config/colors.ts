const gradientStart = '#FF512F';
const gradientEnd = '#DD2476';
const error = '#E54545';

export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  BGLight: '#EDF0F2',
  BGDark: '#13131A',
  B98: '#F5F8FA',
  B85: '#D5D5D9',
  B80: '#BEBECC',
  B70: '#A1A1B2',
  B60: '#828299',
  B40: '#525266',
  B30: '#3D3D4D',
  B20: '#292933',
  B15: '#1E1E26',
  B17: '#23232B',
  gradientStart,
  gradientEnd,
  success: '#4D9980',
  warning: '#FF8000',
  error,
  vertical: `linear-gradient(0deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
  horizontal: `linear-gradient(99deg, ${gradientEnd} 0% 0%, ${gradientStart} 100% 100%)`,
  disabled: 'linear-gradient(90deg, #F5C4D8 0%, #FFCBC1 100%)',
  darkDisabled: 'linear-gradient(90deg, #58203E 0%, #612E29 100%)',
  errorGradient: `linear-gradient(0deg, ${error}33 0%, ${error}33 100%)`,
  gradientMiddle: '#ef3f5a',
};
