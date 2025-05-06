export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatJSONString = (raw: unknown): string => {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2)
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n');
    } catch {
      return raw;
    }
  }

  if (typeof raw === 'object') {
    return JSON.stringify(raw, null, 2)
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
  }

  return String(raw);
};

const PopularHTMLEntities = Object.freeze(['&', '<', '>']);

export function containsHTMLEntities(value: string) {
  if (!value) {
    return false;
  }

  return PopularHTMLEntities.some((entity) => value.includes(entity));
}

export function containsVariables(value: string) {
  return /\{\{[^}]*\}\}/.test(value);
}
