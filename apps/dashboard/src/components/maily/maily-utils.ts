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

/**
 * Wraps a legacy plain-string body into a minimal Maily/TipTap document so it
 * can be opened in the block editor as text blocks. Each line becomes its own
 * paragraph; empty lines are preserved as empty paragraphs.
 */
export const plainTextToMailyJson = (value: string): string => {
  const content = value.split('\n').map((line) => ({
    type: 'paragraph',
    content: line.length > 0 ? [{ type: 'text', text: line }] : [],
  }));

  return JSON.stringify({ type: 'doc', content });
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

const isMailyObject = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (value.type !== 'doc' || !Array.isArray(value.content)) return false;

  return true;
};
