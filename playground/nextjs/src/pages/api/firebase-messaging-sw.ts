/**
 * GET /api/firebase-messaging-sw
 * (also rewritten from /firebase-messaging-sw.js)
 *
 * Serves the FCM service worker with Firebase web config injected from
 * NEXT_PUBLIC_FIREBASE_* env vars. Register /firebase-messaging-sw.js from the
 * /fcm-web-push page.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  FCM_SW_LOG_TYPE,
  FCM_SW_MESSAGE_TYPE,
  FCM_SW_PING_TYPE,
  FCM_SW_SKIP_WAITING_TYPE,
  FCM_SW_VERSION,
} from '@/lib/fcm-web';

const FIREBASE_COMPAT_VERSION = '11.10.0';

const SW_BODY = `
// Activate replacement workers immediately; otherwise a rewritten script sits in
// "waiting" until every playground tab closes and worker edits look like no-ops.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;

  if (type === FCM_SW_SKIP_WAITING_TYPE) {
    self.skipWaiting();

    return;
  }

  if (type === FCM_SW_PING_TYPE && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: SW_VERSION, firebaseReady: firebaseReady });
  }
});

function resolveNotificationContent(payload) {
  const notification = (payload && payload.notification) || {};
  const data = (payload && payload.data) || {};

  return {
    title: notification.title || data.title || 'Novu FCM (empty title)',
    body: notification.body || data.body || data.message || '(empty body)',
    icon: notification.icon || '/favicon.ico',
  };
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  for (const client of clients) {
    client.postMessage(message);
  }

  return clients;
}

async function log(message) {
  console.log('[fcm-sw]', message);
  await broadcast({ type: FCM_SW_LOG_TYPE, message: message, at: new Date().toISOString() });
}

function extractTopic(payload) {
  const from = payload && typeof payload.from === 'string' ? payload.from.trim() : '';

  if (from.indexOf('/topics/') === 0) {
    const topic = from.slice('/topics/'.length).trim();

    if (topic) {
      return topic;
    }
  }

  const data = (payload && payload.data) || {};
  const rawTopic = (typeof data.topic === 'string' && data.topic.trim()) || '';

  if (!rawTopic) {
    return undefined;
  }

  return rawTopic.indexOf('/topics/') === 0 ? rawTopic.slice('/topics/'.length) : rawTopic;
}

async function handlePush(event) {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    await log('Failed to parse push payload: ' + String(error));
  }

  const topic = extractTopic(payload);
  const clients = await broadcast({
    type: FCM_SW_MESSAGE_TYPE,
    payload: payload,
    receivedAt: new Date().toISOString(),
  });

  const content = resolveNotificationContent(payload);
  const data = (payload && payload.data) || {};

  await self.registration.showNotification(content.title, {
    body: content.body,
    icon: content.icon,
    tag: data.__nvMessageId || (topic ? 'novu-fcm-topic-' + topic : 'novu-fcm'),
    data: data,
  });

  await log(
    'Push displayed. openTabs=' +
      clients.length +
      ' title=' +
      JSON.stringify(content.title) +
      (topic ? ' topic=' + JSON.stringify(topic) : '')
  );
}

// Registered before firebase.messaging() so this listener runs first. Firebase's
// own push handler only displays when no tab is visible and would otherwise emit a
// second toast, so stop propagation and own display here for every push.
self.addEventListener('push', (event) => {
  event.stopImmediatePropagation();
  event.waitUntil(handlePush(event));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of clients) {
      if ('focus' in client) {
        return client.focus();
      }
    }

    return self.clients.openWindow('/fcm-web-push');
  })());
});

if (missingConfigKeys.length > 0) {
  console.error('[fcm-sw] Missing Firebase config keys:', missingConfigKeys.join(', '));
} else {
  // Keeps Firebase's token/subscription plumbing wired up for getToken().
  firebase.initializeApp(firebaseConfig);
  firebase.messaging();
  firebaseReady = true;
}
`.trim();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).send('Method not allowed');

    return;
  }

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  const script = [
    '/* eslint-disable */',
    `importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-app-compat.js');`,
    `importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-messaging-compat.js');`,
    '',
    `const SW_VERSION = ${JSON.stringify(FCM_SW_VERSION)};`,
    `const firebaseConfig = ${JSON.stringify(config, null, 2)};`,
    `const missingConfigKeys = ${JSON.stringify(missing)};`,
    `const FCM_SW_MESSAGE_TYPE = ${JSON.stringify(FCM_SW_MESSAGE_TYPE)};`,
    `const FCM_SW_LOG_TYPE = ${JSON.stringify(FCM_SW_LOG_TYPE)};`,
    `const FCM_SW_SKIP_WAITING_TYPE = ${JSON.stringify(FCM_SW_SKIP_WAITING_TYPE)};`,
    `const FCM_SW_PING_TYPE = ${JSON.stringify(FCM_SW_PING_TYPE)};`,
    'let firebaseReady = false;',
    '',
    SW_BODY,
  ].join('\n');

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(script);
}
