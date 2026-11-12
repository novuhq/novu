export type NovuConfig = {
  applicationIdentifier: string;
  subscriberId: string;
  backendUrl: string;
  socketUrl: string;
  socketOptions?: { socketType: 'cloud' | 'self-hosted' };
};

// The build's values; `_app` replaces them with `/api/novu-config`'s, read when the page loads, before any `pages/` page renders.
export const novuConfig: NovuConfig = {
  applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '',
  subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '',
  backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000',
  socketUrl: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL ?? 'http://localhost:3002',
};
