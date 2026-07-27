import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { RiQrCodeLine, RiRefreshLine, RiSmartphoneLine } from 'react-icons/ri';
import QRCode from 'react-qr-code';
import { requestTelegramMobileLink, type TelegramMobileLink } from '@/api/agents';
import { type IntegrationStoreTelegramMobileLink, requestIntegrationStoreTelegramMobileLink } from '@/api/integrations';
import { Button } from '@/components/primitives/button';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { cn } from '@/utils/ui';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 5 * 60 * 1000;
/** Don't expose the manual refresh control until the current token has been visible long enough to actually scan it. */
const MIN_MANUAL_REFRESH_AGE_MS = 60 * 1000;

const MOBILE_LINK_QUERY_KEY = 'telegramMobileLink' as const;

type CardLayout = 'stacked' | 'inline';

type TelegramMobileSetupCardShellProps = {
  link: TelegramMobileLink | undefined;
  isRefreshing: boolean;
  isError: boolean;
  onRefresh: () => void;
  /** When true, the card is rendered in a "this step is already done" state and disables itself. */
  disabled?: boolean;
  className?: string;
  /**
   * `stacked` (default): vertical layout, QR centered above controls. Best when the parent is narrow.
   * `inline`: text + actions on the left, compact QR + countdown on the right. Matches the credentials Figma.
   */
  layout?: CardLayout;
};

/**
 * Presentational shell that renders the QR / mobile-setup card UI but owns no
 * network state. Wrappers (`AgentTelegramMobileSetupCard`,
 * `IntegrationStoreTelegramMobileSetupCard`) drive the data via their own
 * `useQuery` and pass results in.
 */
function TelegramMobileSetupCardShell({
  link,
  isRefreshing,
  isError,
  onRefresh,
  disabled,
  className,
  layout = 'stacked',
}: TelegramMobileSetupCardShellProps) {
  if (disabled) return null;

  if (layout === 'inline') {
    return (
      <div className={cn('flex w-full flex-col gap-4', className)}>
        <div className="flex w-full items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="text-text-strong text-label-xs flex items-center gap-1 font-medium">
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <img
                    src="/images/telegram-setup/phone-find-line.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-3 w-[10px]"
                  />
                </span>
                Setup from your phone
              </div>
              <p className="text-text-soft text-label-xs leading-4">
                Scan or open the link, then paste the full BotFather message. Refreshes every 5 minutes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {link && <CopyLinkButton url={link.url} />}
              {link && (
                <RefreshLinkButton
                  expiresAtMs={new Date(link.expiresAt).getTime()}
                  isRefreshing={isRefreshing}
                  onRefresh={onRefresh}
                />
              )}
            </div>
            {isError && (
              <p className="text-error-base text-label-xs">Couldn&apos;t generate a setup link. Try refreshing.</p>
            )}
          </div>
          <div className="shrink-0">
            {link ? (
              <QrPreview link={link} isRefreshing={isRefreshing} compact />
            ) : (
              <QrSkeleton size={98} compact />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-stroke-soft bg-bg-weak/50 mt-2 flex w-full max-w-[280px] flex-col gap-2 rounded-md border p-3',
        className
      )}
    >
      <div className="text-text-strong text-label-xs flex items-center gap-1.5 font-medium">
        <RiSmartphoneLine className="size-3.5" />
        Setup from your phone
      </div>
      <p className="text-text-soft text-label-xs leading-4">
        Scan the QR code or open the link on the device where BotFather sent the token. Refreshes every 5 minutes.
      </p>

      <div className="mt-1 flex flex-col items-center gap-2">
        {link ? <QrPreview link={link} isRefreshing={isRefreshing} onRefresh={onRefresh} /> : <QrSkeleton />}
      </div>

      {isError && <p className="text-error-base text-label-xs">Couldn&apos;t generate a setup link. Try refreshing.</p>}
    </div>
  );
}

type AgentTelegramMobileSetupCardProps = {
  integrationIdentifier: string;
  /** When set, mobile setup success returns a `/start` deep link for this subscriber. */
  testSubscriberId?: string | null;
  disabled?: boolean;
  className?: string;
  layout?: CardLayout;
};

/**
 * Agent-scoped variant — issues mobile setup links that bind the BotFather
 * token to an existing Telegram integration (agent resolved server-side).
 */
export function AgentTelegramMobileSetupCard({
  integrationIdentifier,
  testSubscriberId,
  disabled,
  className,
  layout = 'stacked',
}: AgentTelegramMobileSetupCardProps) {
  const { currentEnvironment } = useEnvironment();
  const environmentId = currentEnvironment?._id;

  const linkQuery = useQuery<TelegramMobileLink>({
    queryKey: [MOBILE_LINK_QUERY_KEY, environmentId, integrationIdentifier, testSubscriberId],
    queryFn: () =>
      requestTelegramMobileLink(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        integrationIdentifier,
        testSubscriberId ?? undefined
      ),
    enabled: !disabled && Boolean(environmentId && integrationIdentifier),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: REFRESH_INTERVAL_MS,
    meta: { showError: false },
  });

  return (
    <TelegramMobileSetupCardShell
      link={linkQuery.data}
      isRefreshing={linkQuery.isFetching}
      isError={linkQuery.isError}
      onRefresh={() => linkQuery.refetch()}
      disabled={disabled}
      className={className}
      layout={layout}
    />
  );
}

type IntegrationStoreTelegramMobileSetupCardProps = {
  disabled?: boolean;
  className?: string;
  layout?: CardLayout;
};

/**
 * Integration-store variant — issues mobile setup links for the Telegram
 * provider in the "create integration" flow, before any integration or agent
 * exists. The consume endpoint creates a brand-new Telegram integration on
 * submit.
 */
export function IntegrationStoreTelegramMobileSetupCard({
  disabled,
  className,
  layout = 'stacked',
}: IntegrationStoreTelegramMobileSetupCardProps) {
  const { currentEnvironment } = useEnvironment();
  const environmentId = currentEnvironment?._id;

  const linkQuery = useQuery<IntegrationStoreTelegramMobileLink>({
    queryKey: [MOBILE_LINK_QUERY_KEY, 'integration-store', environmentId],
    queryFn: () =>
      requestIntegrationStoreTelegramMobileLink(requireEnvironment(currentEnvironment, 'No environment selected')),
    enabled: !disabled && Boolean(environmentId),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: REFRESH_INTERVAL_MS,
    meta: { showError: false },
  });

  return (
    <TelegramMobileSetupCardShell
      link={linkQuery.data}
      isRefreshing={linkQuery.isFetching}
      isError={linkQuery.isError}
      onRefresh={() => linkQuery.refetch()}
      disabled={disabled}
      className={className}
      layout={layout}
    />
  );
}

function QrSkeleton({ size = 140, compact }: { size?: number; compact?: boolean }) {
  if (compact) {
    return (
      <div className="bg-bg-muted rounded-lg p-1" aria-label="Loading QR code">
        <div
          className="bg-bg-white flex animate-pulse items-center justify-center rounded"
          style={{ width: size + 8, height: size + 22 }}
        >
          <RiQrCodeLine className="text-text-soft size-8" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-stroke-soft bg-bg-white flex animate-pulse items-center justify-center rounded-md border"
      style={{ width: size, height: size }}
      aria-label="Loading QR code"
    >
      <RiQrCodeLine className="text-text-soft size-8" />
    </div>
  );
}

function QrPreview({
  link,
  isRefreshing,
  compact,
  size = 140,
  onRefresh,
}: {
  link: TelegramMobileLink;
  isRefreshing: boolean;
  compact?: boolean;
  size?: number;
  onRefresh?: () => void;
}) {
  const expiresAtMs = useMemo(() => new Date(link.expiresAt).getTime(), [link.expiresAt]);
  const qrSize = compact ? 84 : size;

  if (compact) {
    return (
      <div className={cn('bg-bg-muted rounded-lg p-1 transition-opacity', isRefreshing && 'opacity-60')}>
        <div className="bg-bg-white flex flex-col items-center overflow-hidden rounded pb-1">
          <div className="flex h-[100px] w-[98px] shrink-0 justify-center pt-1">
            <div className="relative size-[84px]">
              <QRCode value={link.url} size={qrSize} level="H" className="size-full" />
              <div className="bg-bg-white absolute top-1/2 left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
                <img
                  src="/images/providers/light/square/telegram.svg"
                  alt=""
                  aria-hidden="true"
                  className="size-full"
                />
              </div>
            </div>
          </div>
          <ExpiresCountdown expiresAtMs={expiresAtMs} variant="resets" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'bg-bg-white relative rounded-md p-2 transition-opacity',
          isRefreshing && 'opacity-60'
        )}
      >
        <QRCode value={link.url} size={qrSize} level="H" />
        <div className="bg-bg-white absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full p-0.5">
          <img
            src="/images/providers/light/square/telegram.svg"
            alt=""
            aria-hidden="true"
            className="size-full"
          />
        </div>
      </div>
      <ExpiresCountdown expiresAtMs={expiresAtMs} />
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <CopyLinkButton url={link.url} />
        {onRefresh && (
          <RefreshLinkButton expiresAtMs={expiresAtMs} isRefreshing={isRefreshing} onRefresh={onRefresh} />
        )}
      </div>
    </>
  );
}

function ExpiresCountdown({
  expiresAtMs,
  variant = 'refreshes',
}: {
  expiresAtMs: number;
  variant?: 'refreshes' | 'resets';
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, expiresAtMs - now);
  const isStale = remainingMs <= 0;
  const isCompact = variant === 'resets';

  if (isStale) {
    return (
      <div
        className={cn(
          'text-text-soft flex items-center justify-center gap-1',
          isCompact ? 'text-[10px] leading-[14px]' : 'text-label-xs'
        )}
      >
        {isCompact ? (
          <span className="flex size-2.5 items-center justify-center">
            <img
              src="/images/telegram-setup/refresh-cw-small.svg"
              alt=""
              aria-hidden="true"
              className="size-[8.5px]"
            />
          </span>
        ) : (
          <RiRefreshLine className="size-3" />
        )}
        Refreshing…
      </div>
    );
  }

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const padded = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const nearExpiry = remainingMs < TOKEN_TTL_MS - REFRESH_INTERVAL_MS;
  const label = variant === 'resets' ? `Resets in\u00a0${padded}` : `Refreshes in ${padded}`;

  return (
    <div
      className={cn(
        'text-text-soft flex items-center justify-center gap-1',
        isCompact ? 'text-[10px] leading-[14px]' : 'text-label-xs',
        nearExpiry && 'text-warning-base'
      )}
    >
      {isCompact ? (
        <span className="flex size-2.5 items-center justify-center">
          <img
            src="/images/telegram-setup/refresh-cw-small.svg"
            alt=""
            aria-hidden="true"
            className="size-[8.5px]"
          />
        </span>
      ) : (
        <RiRefreshLine className="size-3" />
      )}
      {label}
    </div>
  );
}

function RefreshLinkButton({
  expiresAtMs,
  isRefreshing,
  onRefresh,
}: {
  expiresAtMs: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(id);
  }, []);

  const issuedAtMs = expiresAtMs - TOKEN_TTL_MS;
  const ageMs = now - issuedAtMs;
  const isUnlocked = ageMs >= MIN_MANUAL_REFRESH_AGE_MS;

  if (!isUnlocked) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      mode="ghost"
      size="xs"
      onClick={onRefresh}
      disabled={isRefreshing}
      className="text-text-sub gap-0.5 px-1 py-1.5"
    >
      <span className="flex size-3.5 items-center justify-center">
        <img
          src="/images/telegram-setup/refresh-cw.svg"
          alt=""
          aria-hidden="true"
          className="size-[11.5px]"
        />
      </span>
      Refresh token
    </Button>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showSuccessToast('Mobile setup link copied');
      }
    } catch {
      // Clipboard access can be denied; users can still scan the QR code.
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      mode="outline"
      size="xs"
      onClick={handleCopy}
      className="text-text-sub gap-0.5 px-2 py-1.5"
    >
      <span className="flex size-3.5 items-center justify-center">
        <img
          src="/images/telegram-setup/copy.svg"
          alt=""
          aria-hidden="true"
          className="size-[13px]"
        />
      </span>
      Copy link
    </Button>
  );
}
