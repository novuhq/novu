export const parse = <D = Record<string, unknown>>(value: string): { data: D | null; error: Error | null } => {
  try {
    return { data: JSON.parse(value), error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
};

export const stringify = (value: unknown, pretty = true): string => {
  return JSON.stringify(value, null, pretty ? 2 : 0);
};
