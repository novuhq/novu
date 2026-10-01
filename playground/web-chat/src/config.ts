/**
 * Playground env. Copy `.env.example` → `.env` before `pnpm --filter web-chat dev`.
 */
export const config = {
  applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '',
  subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '',
  agentId: process.env.NEXT_PUBLIC_NOVU_AGENT_ID ?? '',
  backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000',
  socketUrl: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL ?? 'http://127.0.0.1:8787',
  socketType: process.env.NEXT_PUBLIC_NOVU_SOCKET_TYPE as 'cloud' | 'self-hosted' | undefined,
  subscriberHash: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_HASH,
} as const;

export function missingEnvVars(): string[] {
  const missing: string[] = [];
  if (!config.applicationIdentifier) missing.push('NEXT_PUBLIC_NOVU_APP_ID');
  if (!config.subscriberId) missing.push('NEXT_PUBLIC_NOVU_SUBSCRIBER_ID');
  if (!config.agentId) missing.push('NEXT_PUBLIC_NOVU_AGENT_ID');

  return missing;
}
