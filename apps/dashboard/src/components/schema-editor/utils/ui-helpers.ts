export function getMarginClassPx(level: number): string {
  if (level <= 0) return 'ml-0';
  if (level === 1) return 'ml-[24px]';
  if (level === 2) return 'ml-[48px]';
  if (level === 3) return 'ml-[72px]';
  if (level === 4) return 'ml-[96px]';

  return `ml-[${level * 24}px]`;
}
