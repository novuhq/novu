export const capitalize = (text: string) => {
  if (typeof text !== 'string') return '';

  return text.charAt(0).toUpperCase() + text.slice(1);
};
