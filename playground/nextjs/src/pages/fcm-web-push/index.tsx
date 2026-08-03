import { Braces } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Title from '@/components/Title';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  FCM_SW_VERSION,
  type FcmPushMessage,
  type FcmSwDiagnostics,
  type FcmSwLogEntry,
  getFcmSwDiagnostics,
  getFirebaseWebConfig,
  getMissingFirebaseConfigKeys,
  getVapidKey,
  listenForPushMessages,
  obtainFcmWebToken,
  registerFcmServiceWorker,
  showTestOsNotification,
} from '@/lib/fcm-web';
import { novuConfig } from '@/utils/config';

type ActionStatus =
  | { type: 'idle' }
  | { type: 'loading'; label: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

const cardClass = 'w-full max-w-2xl rounded-lg border border-border bg-card p-5 text-left shadow-sm';
const buttonClass =
  'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50';
const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
const monoClass = 'font-mono text-xs break-all whitespace-pre-wrap';
const linkClass = 'underline underline-offset-2 hover:text-foreground';

function ActionFeedback({ status }: { status: ActionStatus }) {
  if (status.type === 'loading') {
    return <p className="mt-3 text-sm text-muted-foreground">{status.label}</p>;
  }

  if (status.type === 'success') {
    return (
      <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
        {status.message}
      </p>
    );
  }

  if (status.type === 'error') {
    return (
      <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        {status.message}
      </p>
    );
  }

  return null;
}

function ReceivedPayloadHover({ raw }: { raw: unknown }) {
  return (
    <HoverCard closeDelay={100} openDelay={200}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          aria-label="View full push payload received on device"
        >
          <Braces className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-auto max-w-md p-0">
        <pre className={`max-h-80 overflow-auto p-3 ${monoClass}`}>{JSON.stringify(raw, null, 2)}</pre>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function FcmWebPushPage() {
  const formId = useId();
  const subscriberIdFieldId = `${formId}-subscriber-id`;
  const [tokenStatus, setTokenStatus] = useState<ActionStatus>({ type: 'idle' });
  const [registerStatus, setRegisterStatus] = useState<ActionStatus>({ type: 'idle' });
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [subscriberId, setSubscriberId] = useState(novuConfig.subscriberId);
  const [messages, setMessages] = useState<FcmPushMessage[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [diagnostics, setDiagnostics] = useState<FcmSwDiagnostics | null>(null);
  const [swLogs, setSwLogs] = useState<FcmSwLogEntry[]>([]);
  const [testStatus, setTestStatus] = useState<ActionStatus>({ type: 'idle' });
  const isBusy = tokenStatus.type === 'loading' || registerStatus.type === 'loading';

  const missingEnv = useMemo(() => {
    const missing = getMissingFirebaseConfigKeys(getFirebaseWebConfig());

    if (!getVapidKey()) {
      missing.push('NEXT_PUBLIC_FIREBASE_VAPID_KEY');
    }

    return missing;
  }, []);

  const refreshDiagnostics = useCallback(async () => {
    try {
      setDiagnostics(await getFcmSwDiagnostics());
    } catch {
      // Diagnostics are best-effort.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');

      return;
    }

    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = listenForPushMessages({
      onMessage: (message) => {
        if (cancelled) {
          return;
        }

        setMessages((prev) => [message, ...prev].slice(0, 20));
      },
      onLog: (entry) => {
        if (cancelled) {
          return;
        }

        setSwLogs((prev) => [entry, ...prev].slice(0, 20));
      },
    });

    void (async () => {
      if (missingEnv.length > 0) {
        return;
      }

      try {
        await registerFcmServiceWorker();
        await refreshDiagnostics();
      } catch {
        // Registration is retried when the user clicks Get FCM web token.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [missingEnv.length, refreshDiagnostics]);

  async function handleTestOsNotification() {
    setTestStatus({ type: 'loading', label: 'Showing local OS notification…' });

    try {
      await showTestOsNotification();
      setPermission(Notification.permission);
      await refreshDiagnostics();
      setTestStatus({
        type: 'success',
        message:
          'Notification requested. If nothing appeared, the browser is blocked at OS level (macOS: System Settings → Notifications → your browser) or Do Not Disturb is on.',
      });
    } catch (error) {
      setTestStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to show notification',
      });
    }
  }

  async function handleForceSwUpdate() {
    setTestStatus({ type: 'loading', label: 'Updating service worker…' });

    try {
      await registerFcmServiceWorker();
      await refreshDiagnostics();
      setTestStatus({ type: 'success', message: 'Service worker update requested.' });
    } catch (error) {
      setTestStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update service worker',
      });
    }
  }

  async function handleGetToken() {
    setTokenStatus({ type: 'loading', label: 'Requesting permission and FCM token…' });
    setRegisterStatus({ type: 'idle' });
    setCopied(false);

    try {
      const result = await obtainFcmWebToken();
      setToken(result.token);
      setPermission(Notification.permission);
      await refreshDiagnostics();
      setTokenStatus({ type: 'success', message: 'FCM web token ready.' });
    } catch (error) {
      setTokenStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to obtain FCM token',
      });
    }
  }

  async function handleCopy() {
    if (!token) {
      return;
    }

    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleRegisterWithNovu() {
    if (!token) {
      setRegisterStatus({ type: 'error', message: 'Get an FCM token first.' });

      return;
    }

    if (!subscriberId.trim()) {
      setRegisterStatus({ type: 'error', message: 'subscriberId is required.' });

      return;
    }

    setRegisterStatus({ type: 'loading', label: 'Registering token on Novu subscriber…' });

    try {
      const response = await fetch('/api/fcm-register-token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: subscriberId.trim(),
          deviceToken: token,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || `Register failed (${response.status})`);
      }

      setRegisterStatus({
        type: 'success',
        message: `Saved FCM token on subscriber “${subscriberId.trim()}”.`,
      });
    } catch (error) {
      setRegisterStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to register token with Novu',
      });
    }
  }

  return (
    <>
      <Title title="FCM Web Push" />

      <div className="flex w-full max-w-2xl flex-col gap-4">
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Minimal FCM web token harness</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Obtain a{' '}
            <a
              className={linkClass}
              href="https://firebase.google.com/docs/cloud-messaging/js/client"
              target="_blank"
              rel="noreferrer"
            >
              Firebase Cloud Messaging <strong>web</strong> registration token
            </a>{' '}
            in the browser, then paste it into a Novu subscriber&apos;s FCM{' '}
            <code className="text-xs">deviceTokens</code> (or use the register button below) to test{' '}
            <a
              className={linkClass}
              href="https://docs.novu.co/platform/integrations/push/fcm"
              target="_blank"
              rel="noreferrer"
            >
              Novu push
            </a>{' '}
            without an Android device.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Create a{' '}
              <a className={linkClass} href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">
                Firebase Web app
              </a>{' '}
              and generate a{' '}
              <a
                className={linkClass}
                href="https://firebase.google.com/docs/cloud-messaging/js/client#configure_web_credentials_in_your_app"
                target="_blank"
                rel="noreferrer"
              >
                Web Push certificate (VAPID key)
              </a>
              .
            </li>
            <li>
              Copy your{' '}
              <a
                className={linkClass}
                href="https://console.firebase.google.com/project/_/settings/general/"
                target="_blank"
                rel="noreferrer"
              >
                Firebase web app config
              </a>{' '}
              into the <code className="text-xs">NEXT_PUBLIC_FIREBASE_*</code> vars in{' '}
              <code className="text-xs">playground/nextjs/.env</code> (see <code className="text-xs">.env.example</code>
              ).
            </li>
            <li>
              Connect the same Firebase service account to{' '}
              <a
                className={linkClass}
                href="https://docs.novu.co/platform/integrations/push/fcm#step-2-connect-fcm-to-novu"
                target="_blank"
                rel="noreferrer"
              >
                Novu&apos;s FCM integration
              </a>
              .
            </li>
            <li>
              Click <strong>Get FCM web token</strong>,{' '}
              <a
                className={linkClass}
                href="https://docs.novu.co/platform/integrations/push/fcm#step-3-register-a-subscribers-device-token"
                target="_blank"
                rel="noreferrer"
              >
                register it on the subscriber
              </a>
              , then trigger a push workflow.
            </li>
          </ol>
        </section>

        <section className={cardClass}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status</h3>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Notification permission</dt>
              <dd className="font-medium">{permission}</dd>
            </div>
            {permission === 'default' && (
              <p className="text-sm text-muted-foreground">
                When you click Get FCM web token, allow the browser prompt (or use the lock/bell icon in the address
                bar). Permission must become <code className="text-xs">granted</code> before a token can be issued.
              </p>
            )}
            {permission === 'denied' && (
              <p className="text-sm text-destructive">
                Notifications are blocked for this origin. Reset them via the address-bar site settings, then reload.
              </p>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Firebase config</dt>
              <dd className="font-medium">{missingEnv.length === 0 ? 'ready' : 'incomplete'}</dd>
            </div>
          </dl>

          {missingEnv.length > 0 && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium">Missing env vars</p>
              <ul className="mt-1 list-disc pl-5 font-mono text-xs">
                {missingEnv.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={handleGetToken}
              disabled={isBusy || missingEnv.length > 0}
            >
              Get FCM web token
            </button>
            <button type="button" className={secondaryButtonClass} onClick={handleCopy} disabled={!token}>
              {copied ? 'Copied' : 'Copy token'}
            </button>
          </div>

          <ActionFeedback status={tokenStatus} />
        </section>

        <section className={cardClass}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Service worker diagnostics
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Background OS notifications are rendered by the service worker, so it must be active and up to date. If{' '}
            <strong>active version</strong> does not match <strong>expected</strong>, an old worker is still running —
            click <strong>Force update</strong>.
          </p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Registered</dt>
              <dd className="font-medium">{diagnostics?.registered ? 'yes' : 'no'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Worker state</dt>
              <dd className="font-medium">
                {diagnostics
                  ? [
                      diagnostics.hasActive ? 'active' : null,
                      diagnostics.hasWaiting ? 'waiting' : null,
                      diagnostics.hasInstalling ? 'installing' : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'none'
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Controls this page</dt>
              <dd className="font-medium">{diagnostics?.controlled ? 'yes' : 'no'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Active version</dt>
              <dd className="font-mono text-xs">{diagnostics?.activeVersion ?? 'unknown'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Expected version</dt>
              <dd className="font-mono text-xs">{FCM_SW_VERSION}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Firebase ready in worker</dt>
              <dd className="font-medium">{diagnostics?.firebaseReadyInSw ? 'yes' : 'no'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Secure context</dt>
              <dd className="font-medium">{diagnostics?.secureContext ? 'yes' : 'no'}</dd>
            </div>
          </dl>

          {diagnostics && diagnostics.activeVersion !== FCM_SW_VERSION && (
            <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              A stale service worker is active. Click <strong>Force update</strong>, and if the version still does not
              change, close every tab on this origin (or use DevTools → Application → Service Workers → Unregister).
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={handleForceSwUpdate} disabled={isBusy}>
              Force update
            </button>
            <button type="button" className={secondaryButtonClass} onClick={handleTestOsNotification} disabled={isBusy}>
              Show test OS notification
            </button>
          </div>

          <ActionFeedback status={testStatus} />

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Worker push log</h4>
          {swLogs.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No push events seen by the worker yet. Entries appear here only while this tab is open.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {swLogs.map((entry) => (
                <li key={`${entry.at}-${entry.message}`} className={`rounded-md bg-muted p-2 ${monoClass}`}>
                  {entry.at} — {entry.message}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Registration token</h3>
          <pre className={`mt-3 min-h-20 rounded-md bg-muted p-3 ${monoClass}`}>
            {token || 'No token yet — click “Get FCM web token”.'}
          </pre>
        </section>

        <section className={cardClass}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Register on Novu subscriber
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Optional helper that calls Novu&apos;s credentials API with <code className="text-xs">NOVU_SECRET_KEY</code>
            . You can also paste the token into the dashboard / API yourself.
          </p>
          <label className="mt-3 block text-sm font-medium" htmlFor={subscriberIdFieldId}>
            Subscriber ID
          </label>
          <input
            id={subscriberIdFieldId}
            className={`${inputClass} mt-1`}
            value={subscriberId}
            onChange={(event) => setSubscriberId(event.target.value)}
            placeholder="subscriberId"
          />
          <div className="mt-3">
            <button type="button" className={buttonClass} onClick={handleRegisterWithNovu} disabled={isBusy || !token}>
              Save token on subscriber
            </button>
          </div>

          <ActionFeedback status={registerStatus} />
        </section>

        <section className={cardClass}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Received messages</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The service worker displays an OS notification for every push and forwards the payload here, so this works
            whether or not the playground is the focused tab. Hover the{' '}
            <Braces className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden /> icon on a message to inspect the
            full payload received on the device.
          </p>
          {messages.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No messages received yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {messages.map((message) => (
                <li key={`${message.receivedAt}-${message.title ?? ''}`} className="rounded-md bg-muted p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{message.title || '(no title)'}</div>
                      <div className="text-muted-foreground">{message.body || '(no body)'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{message.receivedAt}</div>
                    </div>
                    <ReceivedPayloadHover raw={message.raw} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
