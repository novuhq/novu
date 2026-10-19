import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';

export function requireConnectSecretKey(auth: ResolvedConnectAuth): string {
  const secretKey = auth.secretKey?.trim();
  if (!secretKey) {
    throw new Error('Missing Novu secret key — authenticate with dashboard OAuth or pass --secret-key.');
  }

  return secretKey;
}
