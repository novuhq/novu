export const isEmptyMailyJson = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  const isMaily = isMailyJson(value);
  if (!isMaily) return false;

  try {
    const parsed = JSON.parse(value);
    const content = parsed.content;

    if (!content || content.length === 0) return true;

    const [firstItem] = content;

    return !firstItem?.content?.length;
  } catch {
    return false;
  }
};

export const isMailyJson = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  try {
    const parsed = JSON.parse(value);

    return isMailyObject(parsed);
  } catch {
    return false;
  }
};

export const isMailyObject = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (value.type !== 'doc' || !Array.isArray(value.content)) return false;

  return true;
};
