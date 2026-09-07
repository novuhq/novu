export function normalizeReferences(references: string | string[] | undefined): string[] {
  if (!references) {
    return [];
  }

  if (Array.isArray(references)) {
    return references.flatMap((ref) => ref.trim().split(/\s+/)).filter(Boolean);
  }

  return references.trim().split(/\s+/).filter(Boolean);
}
