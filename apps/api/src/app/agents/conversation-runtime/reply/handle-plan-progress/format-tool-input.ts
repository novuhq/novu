const SUMMARY_KEY_PRIORITY = ['query', 'command', 'path', 'action'];
const MAX_DETAIL_LENGTH = 200;

export function formatToolInputSummary(input: Record<string, unknown> | undefined): string | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const keys = Object.keys(input);
  if (keys.length === 0) return undefined;

  if (keys.length === 1) {
    return truncate(String(input[keys[0]]), MAX_DETAIL_LENGTH);
  }

  const primaryKey = keys.find((k) => SUMMARY_KEY_PRIORITY.includes(k));
  if (primaryKey) {
    return truncate(String(input[primaryKey]), MAX_DETAIL_LENGTH);
  }

  const pairs = keys.slice(0, 3).map((k) => {
    const val = typeof input[k] === 'string' ? input[k] : JSON.stringify(input[k]);

    return `${k}: ${val}`;
  });

  return truncate(pairs.join(', '), MAX_DETAIL_LENGTH);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;

  return `${str.slice(0, max - 1)}…`;
}
