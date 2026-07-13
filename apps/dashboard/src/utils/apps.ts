export function isAbsoluteUrl(target: string): boolean {
  return /^https?:\/\//i.test(target);
}
