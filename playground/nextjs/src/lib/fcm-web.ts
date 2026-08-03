export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export type FcmPushMessage = {
  receivedAt: string;
  title?: string;
  body?: string;
  /** FCM topic name when the push was delivered via topic messaging. */
  topic?: string;
  data?: Record<string, string>;
  raw: unknown;
};

/** Playground topic inbox — subscribe the web token to this FCM topic to receive broadcasts. */
export const FCM_TOPIC_NEWS_UPDATES = 'news_updates';

export type FcmSwLogEntry = {
  at: string;
  message: string;
};

export type FcmSwDiagnostics = {
  supported: boolean;
  secureContext: boolean;
  registered: boolean;
  scope?: string;
  hasInstalling: boolean;
  hasWaiting: boolean;
  hasActive: boolean;
  controlled: boolean;
  activeVersion?: string;
  expectedVersion: string;
  firebaseReadyInSw?: boolean;
};

export const FCM_SW_MESSAGE_TYPE = 'NOVU_FCM_PUSH';
export const FCM_SW_LOG_TYPE = 'NOVU_FCM_SW_LOG';
export const FCM_SW_SKIP_WAITING_TYPE = 'NOVU_FCM_SKIP_WAITING';
export const FCM_SW_PING_TYPE = 'NOVU_FCM_PING';

/** Bump when the generated service worker script changes. */
export const FCM_SW_VERSION = '2026-08-03.4';

const FIREBASE_COMPAT_VERSION = '11.10.0';
const SW_URL = '/firebase-messaging-sw.js';

type FirebaseCompat = {
  apps: unknown[];
  initializeApp: (config: FirebaseWebConfig) => unknown;
  messaging: () => {
    getToken: (options: { vapidKey: string; serviceWorkerRegistration: ServiceWorkerRegistration }) => Promise<string>;
  };
};

export type PushPayload = {
  from?: string;
  notification?: { title?: string; body?: string; icon?: string };
  data?: Record<string, string>;
};

/**
 * Topic messages may set `from` to `/topics/<name>`. Web payloads often omit that,
 * so also accept common data keys (`topic`, `__nvTopic`) for playground routing.
 */
export function extractFcmTopic(payload: PushPayload): string | undefined {
  const from = payload.from?.trim();

  if (from?.startsWith('/topics/')) {
    const topic = from.slice('/topics/'.length).trim();

    if (topic) {
      return topic;
    }
  }

  const dataTopic = payload.data?.topic?.trim() || payload.data?.__nvTopic?.trim();

  if (dataTopic) {
    return dataTopic.startsWith('/topics/') ? dataTopic.slice('/topics/'.length) : dataTopic;
  }

  return undefined;
}

declare global {
  interface Window {
    firebase?: FirebaseCompat;
  }
}

export function getFirebaseWebConfig(): FirebaseWebConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

export function getMissingFirebaseConfigKeys(config: FirebaseWebConfig = getFirebaseWebConfig()): string[] {
  return Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => `NEXT_PUBLIC_FIREBASE_${toEnvSuffix(key)}`);
}

function toEnvSuffix(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();
}

export function getVapidKey(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';
}

export const FIREBASE_COMPAT_SCRIPT_URLS = [
  `https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-app-compat.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-messaging-compat.js`,
] as const;

/** Mirrors the fallbacks in the service worker so an empty push is still visible. */
export function resolveNotificationContent(payload: PushPayload): {
  title: string;
  body: string;
} {
  const title = payload.notification?.title || payload.data?.title || 'Novu FCM (empty title)';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || '(empty body)';

  return { title, body };
}

export function toFcmPushMessage(payload: PushPayload, receivedAt = new Date().toISOString()): FcmPushMessage {
  const { title, body } = resolveNotificationContent(payload);

  return {
    receivedAt,
    title,
    body,
    topic: extractFcmTopic(payload),
    data: payload.data,
    raw: payload,
  };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();

        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });

      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export async function ensureFirebaseCompatLoaded(): Promise<FirebaseCompat> {
  for (const src of FIREBASE_COMPAT_SCRIPT_URLS) {
    await loadScript(src);
  }

  if (!window.firebase) {
    throw new Error('Firebase compat SDK failed to initialize on window.firebase.');
  }

  return window.firebase;
}

/**
 * A rewritten service worker script normally sits in `waiting` until every tab on
 * the origin closes, which makes worker changes look like no-ops. Promote the
 * waiting worker explicitly instead.
 */
async function activateWaitingWorker(registration: ServiceWorkerRegistration): Promise<void> {
  const waiting = registration.waiting;

  if (!waiting || !navigator.serviceWorker.controller) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 3000);

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );

    waiting.postMessage({ type: FCM_SW_SKIP_WAITING_TYPE });
  });
}

export async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });

  try {
    await registration.update();
  } catch {
    // Update checks fail offline — the existing worker still handles pushes.
  }

  await activateWaitingWorker(registration);
  await navigator.serviceWorker.ready;

  return registration;
}

function pingServiceWorker(worker: ServiceWorker): Promise<{ version?: string; firebaseReady?: boolean } | undefined> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => resolve(undefined), 1500);

    channel.port1.onmessage = (event: MessageEvent) => {
      window.clearTimeout(timeout);
      resolve(event.data as { version?: string; firebaseReady?: boolean });
    };

    worker.postMessage({ type: FCM_SW_PING_TYPE }, [channel.port2]);
  });
}

export async function getFcmSwDiagnostics(): Promise<FcmSwDiagnostics> {
  const base: FcmSwDiagnostics = {
    supported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    secureContext: typeof window !== 'undefined' && window.isSecureContext,
    registered: false,
    hasInstalling: false,
    hasWaiting: false,
    hasActive: false,
    controlled: false,
    expectedVersion: FCM_SW_VERSION,
  };

  if (!base.supported) {
    return base;
  }

  const registration = await navigator.serviceWorker.getRegistration(SW_URL);

  if (!registration) {
    return base;
  }

  const pong = registration.active ? await pingServiceWorker(registration.active) : undefined;

  return {
    ...base,
    registered: true,
    scope: registration.scope,
    hasInstalling: Boolean(registration.installing),
    hasWaiting: Boolean(registration.waiting),
    hasActive: Boolean(registration.active),
    controlled: Boolean(navigator.serviceWorker.controller),
    activeVersion: pong?.version,
    firebaseReadyInSw: pong?.firebaseReady,
  };
}

async function ensurePermissionGranted(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    throw new Error('This browser does not support the Notifications API.');
  }

  let permission = Notification.permission;

  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission === 'denied') {
    throw new Error(
      'Notification permission is blocked for this origin. Address bar → site settings → Notifications → Allow, then reload.'
    );
  }

  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
}

/**
 * Renders an OS notification without involving FCM. If this shows nothing, the
 * problem is browser/OS notification settings rather than Novu or Firebase.
 */
export async function showTestOsNotification(): Promise<void> {
  await ensurePermissionGranted();

  const registration = await registerFcmServiceWorker();

  await registration.showNotification('Novu playground test', {
    body: 'Local OS notification — FCM was not involved.',
    icon: '/favicon.ico',
    tag: 'novu-fcm-local-test',
  });
}

export async function obtainFcmWebToken(): Promise<{
  token: string;
  registration: ServiceWorkerRegistration;
}> {
  const config = getFirebaseWebConfig();
  const missing = getMissingFirebaseConfigKeys(config);
  const vapidKey = getVapidKey();

  if (missing.length > 0) {
    throw new Error(`Missing Firebase env vars: ${missing.join(', ')}. See .env.example.`);
  }

  if (!vapidKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not configured.');
  }

  if (typeof window === 'undefined') {
    throw new Error('FCM web tokens can only be obtained in the browser.');
  }

  if (!window.isSecureContext) {
    throw new Error(
      'Notifications require a secure context (https:// or http://localhost). Open the playground on its https:// host or localhost, not a plain LAN IP.'
    );
  }

  await ensurePermissionGranted();

  const firebase = await ensureFirebaseCompatLoaded();

  if (firebase.apps.length === 0) {
    firebase.initializeApp(config);
  }

  const registration = await registerFcmServiceWorker();

  const token = await firebase.messaging().getToken({
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Firebase returned an empty registration token.');
  }

  return { token, registration };
}

/**
 * The service worker owns notification display and broadcasts every push to open
 * pages, so this works whether or not the tab is focused.
 */
export function listenForPushMessages(handlers: {
  onMessage: (message: FcmPushMessage) => void;
  onLog?: (entry: FcmSwLogEntry) => void;
}): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => undefined;
  }

  const handler = (event: MessageEvent) => {
    const data = event.data as
      | { type?: string; payload?: PushPayload; receivedAt?: string; message?: string; at?: string }
      | undefined;

    if (!data) {
      return;
    }

    if (data.type === FCM_SW_MESSAGE_TYPE && data.payload) {
      handlers.onMessage(toFcmPushMessage(data.payload, data.receivedAt));

      return;
    }

    if (data.type === FCM_SW_LOG_TYPE && data.message) {
      handlers.onLog?.({ at: data.at ?? new Date().toISOString(), message: data.message });
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}
