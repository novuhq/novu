const MAX_METADATA_KEYS = 10;
const MAX_METADATA_TOTAL_CHARS = 500;

export type ParseDomainMetadataResult =
  | { ok: true; data: Record<string, string> }
  | { ok: false; message: string };

export function parseDomainMetadataJson(raw: string): ParseDomainMetadataResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, message: 'Enter a JSON object (use {} for no metadata).' };
  }

  if (trimmed === '{}') {
    return { ok: true, data: {} };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, message: 'Invalid JSON.' };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, message: 'Metadata must be a JSON object.' };
  }

  const record = parsed as Record<string, unknown>;
  const entries = Object.entries(record);

  if (entries.length > MAX_METADATA_KEYS) {
    return { ok: false, message: `At most ${MAX_METADATA_KEYS} keys are allowed.` };
  }

  let totalChars = 0;
  const data: Record<string, string> = {};

  for (const [key, value] of entries) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      return { ok: false, message: 'Metadata keys and values must be strings.' };
    }

    totalChars += key.length + value.length;

    if (totalChars > MAX_METADATA_TOTAL_CHARS) {
      return {
        ok: false,
        message: `Total length of keys and values must be at most ${MAX_METADATA_TOTAL_CHARS} characters.`,
      };
    }

    data[key] = value;
  }

  return { ok: true, data };
}
