export function parsePageParam(param: string | null): number {
  if (!param) return 0;

  const parsed = Number.parseInt(param, 10);

  return Math.max(0, parsed || 0);
}
