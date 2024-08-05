export type Cache<T = unknown> = {
  get: (key: string) => T | undefined;
  getValues: () => T[];
  entries: () => [string, T][];
  keys: () => string[];
  set: (key: string, value: T) => void;
  remove: (key: string) => void;
  clear: () => void;
};
