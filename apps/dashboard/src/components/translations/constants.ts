// Default pagination settings
export const DEFAULT_TRANSLATIONS_LIMIT = 10;
export const DEFAULT_TRANSLATIONS_OFFSET = 0;

// File validation
export const ACCEPTED_FILE_EXTENSION = '.json';

// Date format options
export const DATE_FORMAT_OPTIONS = {
  month: 'short' as const,
  day: 'numeric' as const,
  year: 'numeric' as const,
};

export const TIME_FORMAT_OPTIONS = {
  hour12: false as const,
  hour: '2-digit' as const,
  minute: '2-digit' as const,
  second: '2-digit' as const,
};
