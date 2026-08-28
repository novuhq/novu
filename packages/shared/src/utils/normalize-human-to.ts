import { HUMAN_INTERACTION_MAX_RECIPIENTS } from '../types/human-interaction';

export function tryNormalizeHumanTo(to: unknown): string[] | null {
  if (typeof to === 'string') {
    const id = to.trim();

    return id.length > 0 ? [id] : null;
  }

  if (!Array.isArray(to) || to.some((item) => typeof item !== 'string')) {
    return null;
  }

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const item of to) {
    const id = item.trim();
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    unique.push(id);
  }

  if (unique.length === 0 || unique.length > HUMAN_INTERACTION_MAX_RECIPIENTS) {
    return null;
  }

  return unique;
}

export function normalizeHumanTo(to: string | string[]): string[] {
  const ids = tryNormalizeHumanTo(to);
  if (ids) {
    return ids;
  }

  const uniqueCount = countUniqueHumanTo(to);
  if (uniqueCount > HUMAN_INTERACTION_MAX_RECIPIENTS) {
    throw new Error(`\`to\` supports at most ${HUMAN_INTERACTION_MAX_RECIPIENTS} subscriberIds`);
  }

  throw new Error('`to` must include at least one subscriberId');
}

export function humanInteractionRecipientIds(interaction: { subscriberIds?: string[] }): string[] {
  return interaction.subscriberIds ?? [];
}

function countUniqueHumanTo(to: string | string[]): number {
  const values = typeof to === 'string' ? [to] : to;
  const seen = new Set<string>();

  for (const value of values) {
    const id = value.trim();
    if (id) {
      seen.add(id);
    }
  }

  return seen.size;
}
