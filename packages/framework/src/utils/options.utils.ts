export function resolveApiUrl(providedApiUrl?: string): string {
  return providedApiUrl || process.env.NOVU_API_URL || 'https://api.novu.co';
}

export function resolveSecretKey(providedSecretKey?: string): string {
  return providedSecretKey || process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY || '';
}
