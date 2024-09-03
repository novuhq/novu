export const novuConfig = {
  applicationIdentifier: import.meta.env.VITE_NOVU_APP_ID ?? '5juhaoGv5h1X',
  subscriberId: import.meta.env.VITE_NOVU_SUBSCRIBER_ID ?? '64eb70ca735c8d00d96d7d14',
  backendUrl: import.meta.env.VITE_NOVU_BACKEND_URL ?? 'https://api.novu.co',
  socketUrl: import.meta.env.VITE_NOVU_SOCKET_URL ?? 'https://ws.novu.co',
};
