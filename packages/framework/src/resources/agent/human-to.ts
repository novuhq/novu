/** Matches `@novu/shared` `HUMAN_INTERACTION_MAX_RECIPIENTS` — kept local so framework stays free of that package. */
export const HUMAN_CTX_MAX_RECIPIENTS = 50;

export function normalizeHumanTo(to: string | string[]): string[] {
  const values = typeof to === 'string' ? [to] : to;
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string') {
      throw new Error('`to` must be a subscriberId string or an array of subscriberIds');
    }

    const id = value.trim();
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    unique.push(id);
  }

  if (unique.length === 0) {
    throw new Error('`to` must include at least one subscriberId');
  }

  if (unique.length > HUMAN_CTX_MAX_RECIPIENTS) {
    throw new Error(`\`to\` supports at most ${HUMAN_CTX_MAX_RECIPIENTS} subscriberIds`);
  }

  return unique;
}
