import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { RiFileCopyLine, RiQrCodeLine, RiRefreshLine, RiSmartphoneLine } from 'react-icons/ri';
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
   * `inline`: QR on the left, helper text + actions on the right. Best for wider containers like modals.
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
      <div
        className={cn('border-stroke-soft bg-bg-weak/50 flex w-full flex-row gap-3 rounded-md border p-3', className)}
      >
        <div className="shrink-0">
          {link ? <QrPreview link={link} isRefreshing={isRefreshing} hideMeta size={120} /> : <QrSkeleton size={120} />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="text-text-strong text-label-xs flex items-center gap-1.5 font-medium">
              <RiSmartphoneLine className="size-3.5" />
              Set up from your phone
            </div>
            <p className="text-text-soft text-label-xs leading-4">
              Scan or open the link on the device where BotFather sent the token and paste the entire message. Refreshes
              every 5 minutes.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            {link && (
              <>
                <ExpiresCountdown expiresAtMs={new Date(link.expiresAt).getTime()} />
                <div className="flex flex-wrap items-center gap-1.5">
                  <CopyLinkButton url={link.url} />
                  <RefreshLinkButton
                    expiresAtMs={new Date(link.expiresAt).getTime()}
                    isRefreshing={isRefreshing}
                    onRefresh={onRefresh}
                  />
                </div>
              </>
            )}
            {isError && (
              <p className="text-error-base text-label-xs">Couldn&apos;t generate a setup link. Try refreshing.</p>
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
        Set up from your phone
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
  agentIdentifier: string;
  integrationId: string;
  /** When set, mobile setup success returns a `/start` deep link for this subscriber. */
  testSubscriberId?: string | null;
  disabled?: boolean;
  className?: string;
  layout?: CardLayout;
};

/**
 * Agent-scoped variant — issues mobile setup links that bind the BotFather
 * token to an existing agent–integration pair.
 */
export function AgentTelegramMobileSetupCard({
  agentIdentifier,
  integrationId,
  testSubscriberId,
  disabled,
  className,
  layout = 'stacked',
}: AgentTelegramMobileSetupCardProps) {
  const { currentEnvironment } = useEnvironment();
  const environmentId = currentEnvironment?._id;

  const linkQuery = useQuery<TelegramMobileLink>({
    queryKey: [MOBILE_LINK_QUERY_KEY, environmentId, agentIdentifier, integrationId, testSubscriberId],
    queryFn: () =>
      requestTelegramMobileLink(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier,
        integrationId,
        testSubscriberId ?? undefined
      ),
    enabled: !disabled && Boolean(environmentId && agentIdentifier && integrationId),
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

function QrSkeleton({ size = 140 }: { size?: number }) {
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
  hideMeta,
  size = 140,
  onRefresh,
}: {
  link: TelegramMobileLink;
  isRefreshing: boolean;
  hideMeta?: boolean;
  size?: number;
  onRefresh?: () => void;
}) {
  const expiresAtMs = useMemo(() => new Date(link.expiresAt).getTime(), [link.expiresAt]);

  return (
    <>
      <div className={cn('bg-bg-white rounded-md p-2 transition-opacity', isRefreshing && 'opacity-60')}>
        <QRCode value={link.url} size={size} />
      </div>
      {!hideMeta && (
        <>
          <ExpiresCountdown expiresAtMs={expiresAtMs} />
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <CopyLinkButton url={link.url} />
            {onRefresh && (
              <RefreshLinkButton expiresAtMs={expiresAtMs} isRefreshing={isRefreshing} onRefresh={onRefresh} />
            )}
          </div>
        </>
      )}
    </>
  );
}

function ExpiresCountdown({ expiresAtMs }: { expiresAtMs: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, expiresAtMs - now);
  const isStale = remainingMs <= 0;

  if (isStale) {
    return (
      <div className="text-text-soft flex items-center gap-1 text-label-xs">
        <RiRefreshLine className="size-3" />
        Refreshing…
      </div>
    );
  }

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const padded = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const nearExpiry = remainingMs < TOKEN_TTL_MS - REFRESH_INTERVAL_MS;

  return (
    <div className={cn('text-text-soft flex items-center gap-1 text-label-xs', nearExpiry && 'text-warning-base')}>
      <RiRefreshLine className="size-3" />
      Refreshes in {padded}
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
      mode="outline"
      size="xs"
      leadingIcon={RiRefreshLine}
      onClick={onRefresh}
      disabled={isRefreshing}
      className="text-text-sub gap-1.5 px-2 py-1.5"
    >
      Refresh
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
      leadingIcon={RiFileCopyLine}
      onClick={handleCopy}
      className="text-text-sub gap-1.5 px-2 py-1.5"
    >
      Copy link
    </Button>
  );
}
