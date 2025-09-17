const POPULAR_TEMPLATE_IDS: string[] = ['welcome', 'upcoming-renewal'];

export function selectPopularByIdStrict<T>(items: T[], getId: (item: T) => string | undefined, max: number): T[] {
  // Runtime parameter validation
  if (!Array.isArray(items)) {
    return [];
  }

  if (typeof getId !== 'function') {
    return [];
  }

  if (typeof max !== 'number' || !Number.isFinite(max)) {
    max = 0;
  } else {
    max = Math.max(0, Math.floor(max));
  }

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const wantedNormalized = POPULAR_TEMPLATE_IDS.map((id) => normalize(id)).filter(Boolean);

  const seen = new Set<string>();
  const result: T[] = [];

  for (const wanted of wantedNormalized) {
    const match = items.find((item) => {
      const currentId = getId(item);
      if (!currentId) return false;
      const normalized = normalize(currentId);
      return normalized === wanted;
    });

    if (!match) continue;

    const id = getId(match);
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(match);
    }

    if (result.length >= max) break;
  }

  return result;
}
