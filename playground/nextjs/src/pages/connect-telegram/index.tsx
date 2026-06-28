import { useTelegramSubscriberLink } from '@novu/nextjs/hooks';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, TimerReset, XCircle } from 'lucide-react';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

// Point the headless hook at a backend that injects the secret key:
//   - `/api/novu-proxy`    -> forwards to the real Novu API (production-style, secure)
//   - `/api/telegram-demo` -> offline simulator (no bot/agent/secret required)
const TELEGRAM_API_URL = process.env.NEXT_PUBLIC_NOVU_TELEGRAM_API_URL ?? '/api/novu-proxy';
const INTEGRATION_IDENTIFIER = process.env.NEXT_PUBLIC_NOVU_TELEGRAM_INTEGRATION_IDENTIFIER ?? '';

const IS_DEMO = TELEGRAM_API_URL.includes('telegram-demo');

const STATUS_META = {
  loading: { label: 'Loading...', className: 'text-muted-foreground', Icon: Loader2, spin: true },
  pending: { label: 'Waiting for connection…', className: 'text-amber-600', Icon: Loader2, spin: true },
  connected: { label: 'Connected', className: 'text-green-600', Icon: CheckCircle2, spin: false },
  expired: { label: 'Link expired — re-issuing…', className: 'text-muted-foreground', Icon: TimerReset, spin: false },
} as const;

function TelegramConnectorContent({
  status,
  subscriberId,
  deepLinkUrl,
  botUsername,
}: {
  status: keyof typeof STATUS_META;
  subscriberId: string;
  deepLinkUrl: string | null;
  botUsername: string | null;
}) {
  if (status === 'loading') {
    return null;
  }

  if (status === 'connected') {
    return (
      <p className="text-sm text-muted-foreground">
        Subscriber <code>{subscriberId}</code> is now linked to Telegram. Notifications routed through this integration
        will reach their chat.
      </p>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Tap the button (or scan the QR with your phone) to open Telegram and press <strong>Start</strong>. The hook
        polls until the connection is confirmed and auto-reissues the link when the 10-minute code expires.
      </p>

      {deepLinkUrl ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* QR is a nicety for opening on a phone; hidden gracefully if the generator is unreachable. */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(deepLinkUrl)}`}
            alt="Telegram deep link QR code"
            width={160}
            height={160}
            className="rounded-md border"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="flex flex-col gap-2">
            <a
              href={deepLinkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-md bg-[#229ED9] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open @{botUsername} in Telegram
            </a>
            <code className="max-w-md break-all text-xs text-muted-foreground">{deepLinkUrl}</code>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Issuing deep link…</p>
      )}
    </>
  );
}

function TelegramConnector({
  apiUrl,
  integrationIdentifier,
  subscriberId,
}: {
  apiUrl: string;
  integrationIdentifier: string;
  subscriberId: string;
}) {
  const { deepLinkUrl, botUsername, status, error, refresh } = useTelegramSubscriberLink({
    apiUrl,
    integrationIdentifier,
    subscriberId,
    pollIntervalMs: 2000,
  });

  const meta = STATUS_META[status];

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-5">
      <div className={`flex items-center gap-2 text-sm font-medium ${meta.className}`}>
        <meta.Icon className={`h-4 w-4 ${meta.spin ? 'animate-spin' : ''}`} aria-hidden="true" />
        <span>{meta.label}</span>
      </div>

      <TelegramConnectorContent
        status={status}
        subscriberId={subscriberId}
        deepLinkUrl={deepLinkUrl}
        botUsername={botUsername}
      />

      {status !== 'loading' && error && (
        <p className="flex items-start gap-2 text-xs text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="break-all">{error.message}</span>
        </p>
      )}

      {status !== 'loading' && (
        <button
          onClick={() => void refresh()}
          className="inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Re-issue link
        </button>
      )}
    </div>
  );
}

export default function ConnectTelegramPage() {
  const subscriberId = novuConfig.subscriberId || 'playground-subscriber';
  const ready = IS_DEMO || INTEGRATION_IDENTIFIER;

  return (
    <>
      <Title title="Connect Telegram (headless)" />
      <div className="flex max-w-xl flex-col gap-6 p-4">
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">
            <code>useTelegramSubscriberLink</code> — subscriber-link deep link
          </h4>
          <p className="text-xs text-muted-foreground">
            Headless Telegram linking from <code>@novu/react</code> (re-exported by <code>@novu/nextjs/hooks</code>).
            The hook issues a <code>t.me/&lt;bot&gt;?start=&lt;code&gt;</code> deep link, polls for the
            subscriber&apos;s <strong>Start</strong> tap, and re-issues automatically on code expiry. Calls are routed
            through <code>{TELEGRAM_API_URL}</code> so the secret key never reaches the browser.
          </p>
          <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <span>
              Mode: <code>{IS_DEMO ? 'demo simulator' : 'live proxy'}</code>
            </span>
            <span>
              Integration:{' '}
              <code>
                {INTEGRATION_IDENTIFIER ||
                  (IS_DEMO ? 'demo-integration' : '— set NEXT_PUBLIC_NOVU_TELEGRAM_INTEGRATION_IDENTIFIER')}
              </code>
            </span>
            <span>
              Subscriber: <code>{subscriberId}</code>
            </span>
          </div>
        </section>

        {ready ? (
          <TelegramConnector
            apiUrl={TELEGRAM_API_URL}
            integrationIdentifier={INTEGRATION_IDENTIFIER || 'demo-integration'}
            subscriberId={subscriberId}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            Set <code>NEXT_PUBLIC_NOVU_TELEGRAM_INTEGRATION_IDENTIFIER</code> (plus <code>NOVU_SECRET_KEY</code> on the
            server) to use the live proxy — or set <code>NEXT_PUBLIC_NOVU_TELEGRAM_API_URL=/api/telegram-demo</code> to
            try the offline simulator with no bot required.
          </div>
        )}
      </div>
    </>
  );
}
