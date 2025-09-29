export function formatCount(count: number, threshold: number = 500): string {
  if (count > threshold) {
    return `${threshold}+`;
  }

  return count.toString();
}

export function formatCountForTooltip(count: number, isCapped: boolean): string {
  // If the backend indicates the count is capped (at 50k), show the + sign
  // Otherwise, show the exact count even if it's above our client-side 500 threshold
  if (isCapped) {
    return `${count.toLocaleString()}+`;
  }

  return count.toLocaleString();
}
