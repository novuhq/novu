import { EnvironmentTypeEnum, IEnvironment, isSubscriberTokensRequired, PermissionsEnum } from '@novu/shared';
import { type ReactNode, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { PermissionSwitch } from '@/components/primitives/permission-switch';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { StatusBadge, Dot as StatusBadgeDot } from '@/components/primitives/status-badge';
import { ExternalLink } from '@/components/shared/external-link';
import { useFetchSubscriberSessionStats } from '@/hooks/use-fetch-subscriber-session-stats';
import { useUpdateSubscriberTokensSetting } from '@/hooks/use-update-subscriber-tokens-setting';
import { cn } from '@/utils/ui';
import { SubscriberTokensLogins } from './subscriber-tokens-logins';
import {
  DEFAULT_WINDOW_DAYS,
  describeStatus,
  describeTurnOn,
  formatLastSeen,
  type Readiness,
  type ReadinessStatus,
  readinessOf,
  STATUS_LABEL,
  STATUS_TONE,
  viewClientsLabel,
  type WindowDays,
} from './subscriber-tokens-readiness';

const SWITCH_ID = 'require-subscriber-tokens';
/** Keeps the dialog's buttons on screen however many old clients there are. */
const DIALOG_CLIENT_LIMIT = 5;

export function SubscriberTokensCard({ environment }: { environment: IEnvironment }) {
  const isProduction = environment.type === EnvironmentTypeEnum.PROD;
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [days, setDays] = useState<WindowDays>(DEFAULT_WINDOW_DAYS);
  const [isExpanded, setIsExpanded] = useState(false);
  const updateSetting = useUpdateSubscriberTokensSetting();
  const required = isSubscriberTokensRequired(environment);
  const statsQuery = useFetchSubscriberSessionStats(environment, days, isProduction);
  // A failed refresh keeps the previous data; counts that may be stale must not decide anything.
  const stats = statsQuery.isError ? undefined : statsQuery.data;
  const readiness = isProduction && stats?.available ? readinessOf(stats, required) : undefined;

  const update = async (nextRequired: boolean) => {
    try {
      await updateSetting.mutateAsync({ environment, required: nextRequired });
      showSuccessToast(
        nextRequired
          ? `Signed subscriber tokens are required in ${environment.name}`
          : `Signed subscriber tokens are no longer required in ${environment.name}`
      );
      setIsConfirmOpen(false);
    } catch (error) {
      showErrorToast((error instanceof Error && error.message) || 'Failed to update the setting');
    }
  };

  const handleCheckedChange = (checked: boolean) => {
    if (checked) {
      setIsConfirmOpen(true);
    } else {
      void update(false);
    }
  };

  const status: ReadinessStatus | undefined = required ? 'on' : readiness?.status;

  return (
    <>
      <Card className="w-full overflow-hidden shadow-none">
        <CardHeader>
          Signed subscriber tokens
          <p className="text-foreground-500 mt-1 text-xs font-normal">
            {'Only let subscribers in with a subscriber token your backend signs. '}
            <ExternalLink
              href="https://docs.novu.co/platform/inbox/prepare-for-production"
              className="text-foreground-500"
            >
              Learn more
            </ExternalLink>
          </p>
        </CardHeader>
        <CardContent className="rounded-b-xl border-t bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <label htmlFor={SWITCH_ID} className="text-foreground-600 flex items-center gap-2 text-xs font-medium">
                Require signed subscriber tokens
                {status && <ReadinessBadge status={status} />}
              </label>
              <span className="text-foreground-500 text-xs">
                {isProduction ? (
                  <ProductionLine
                    environmentName={environment.name}
                    required={required}
                    readiness={readiness}
                    isLoading={statsQuery.isPending}
                    isExpanded={isExpanded}
                    onToggle={() => setIsExpanded((expanded) => !expanded)}
                  />
                ) : (
                  developmentLine(environment.name, required)
                )}
              </span>
            </div>
            <PermissionSwitch
              id={SWITCH_ID}
              permission={PermissionsEnum.ENVIRONMENT_WRITE}
              checked={required}
              onCheckedChange={handleCheckedChange}
              disabled={updateSetting.isPending}
            />
          </div>
          {isProduction && isExpanded && readiness && (
            <SubscriberTokensLogins
              environmentName={environment.name}
              readiness={readiness}
              days={days}
              onDaysChange={setDays}
            />
          )}
        </CardContent>
      </Card>
      <ConfirmationModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => update(true)}
        title={`Require signed subscriber tokens in ${environment.name}?`}
        description={
          <span className="flex flex-col gap-2">
            {isProduction ? (
              <TurnOnSummary readiness={readiness} isLoading={statsQuery.isPending} />
            ) : (
              <span>
                Only signed subscriber tokens will be accepted in {environment.name}. Use this to test your token setup
                before Production.
              </span>
            )}
            <span className="text-foreground-400 text-xs">You can turn this off at any time.</span>
          </span>
        }
        confirmButtonText="Turn on"
        confirmButtonVariant="secondary"
        isLoading={updateSetting.isPending}
      />
    </>
  );
}

function ReadinessBadge({ status }: { status: ReadinessStatus }) {
  return (
    <StatusBadge variant="light" status={STATUS_TONE[status]} className="h-5 font-normal">
      <StatusBadgeDot />
      {STATUS_LABEL[status]}
    </StatusBadge>
  );
}

function developmentLine(environmentName: string, required: boolean): string {
  return required
    ? `Only signed subscriber tokens are accepted in ${environmentName}.`
    : 'Turn this on to test your app with signed tokens before you turn it on in Production.';
}

function ProductionLine({
  environmentName,
  required,
  readiness,
  isLoading,
  isExpanded,
  onToggle,
}: {
  environmentName: string;
  required: boolean;
  readiness: Readiness | undefined;
  isLoading: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}): ReactNode {
  const onLine = `Only signed subscriber tokens are accepted in ${environmentName}. You can turn this off at any time.`;
  if (isLoading) {
    return required ? onLine : 'Counting recent Inbox logins…';
  }
  if (!readiness) {
    return required ? onLine : 'Inbox login counts are unavailable right now.';
  }

  const hasLogins = readiness.tokenLogins + readiness.withoutTokenLogins > 0;

  return (
    <>
      {describeStatus(readiness, environmentName)}
      {hasLogins && (
        <>
          {' '}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            className="text-foreground-600 inline-flex items-center underline underline-offset-2"
          >
            {viewClientsLabel(readiness)}
            <RiArrowRightSLine className={cn('size-3.5 transition-transform', isExpanded && 'rotate-90')} />
          </button>
        </>
      )}
    </>
  );
}

function TurnOnSummary({ readiness, isLoading }: { readiness: Readiness | undefined; isLoading: boolean }) {
  if (isLoading) {
    return <span>Counting recent Inbox logins…</span>;
  }
  if (!readiness) {
    return (
      <span>
        Inbox login counts are unavailable right now, so this can't show which clients still log in without a signed
        token.
      </span>
    );
  }

  return (
    <>
      <span>{describeTurnOn(readiness)}</span>
      {readiness.clientsWithoutToken.length > 0 && (
        <span className="flex flex-col gap-0.5">
          {readiness.clientsWithoutToken.slice(0, DIALOG_CLIENT_LIMIT).map((row) => (
            <span key={row.client} className="text-xs">
              <code className="bg-neutral-alpha-50 rounded px-1 font-mono text-[11px]">{row.client}</code>
              <span className="text-foreground-400">
                {' · '}
                {row.withoutToken.toLocaleString()} {row.withoutToken === 1 ? 'login' : 'logins'}, last seen{' '}
                {formatLastSeen(row.lastSeenWithoutTokenDaysAgo ?? 0)}
              </span>
            </span>
          ))}
          {readiness.clientsWithoutToken.length > DIALOG_CLIENT_LIMIT && (
            <span className="text-foreground-400 text-xs">
              and {readiness.clientsWithoutToken.length - DIALOG_CLIENT_LIMIT} more (see the table on the card)
            </span>
          )}
        </span>
      )}
    </>
  );
}
