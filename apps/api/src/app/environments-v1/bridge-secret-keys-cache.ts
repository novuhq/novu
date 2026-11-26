export function getBridgeSecretKeysCacheKey(environmentId: string): string {
  return `bridge-secret-keys:${environmentId}`;
}
