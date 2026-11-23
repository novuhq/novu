import type { IIntegration } from '@novu/shared';
import { useMemo, useState } from 'react';
import { RiArrowRightSLine, RiCloseLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { CompactButton } from '@/components/primitives/button-compact';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { formatHealthDate, getHealthReason } from '../utils/integration-health';
import { useFailingIntegrations } from './hooks/use-failing-integrations';
import { ProviderIcon } from './provider-icon';

const DISMISSED_STORAGE_PREFIX = 'nv-integration-health-dismissed';

type DismissedFailures = Record<string, string>;

/** A failure is identified by when it started, so closing it hides it until the integration fails again. */
function failureKey(integration: IIntegration) {
  return integration.health?.failedAt ?? '';
}

function readDismissed(storageKey: string): DismissedFailures {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};

    return parsed && typeof parsed === 'object' ? (parsed as DismissedFailures) : {};
  } catch {
    return {};
  }
}

function writeDismissed(storageKey: string, dismissed: DismissedFailures) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(dismissed));
  } catch {
    // Storage blocked: the banner just comes back on the next visit.
  }
}

/**
 * One banner per integration whose provider rejects its credentials, in any environment, so a failure in
 * Production is seen while working in Development. Each links to the failing environment, or opens the
 * integration to reconnect when it's in the current one.
 */
export function IntegrationHealthBanners() {
  const { currentUser, currentOrganization } = useAuth();
  // Per user and organization, so closing a banner in one organization keeps the other's dismissals.
  const storageKey = `${DISMISSED_STORAGE_PREFIX}:${currentUser?._id ?? 'anonymous'}:${currentOrganization?._id ?? 'none'}`;
  const failing = useFailingIntegrations();
  // Bumped on each close so the stored map is read again; re-read too once the user loads.
  const [version, setVersion] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the re-read trigger.
  const dismissed = useMemo(() => readDismissed(storageKey), [storageKey, version]);

  const visible = failing.filter((integration) => dismissed[integration._id] !== failureKey(integration));
  if (visible.length === 0) return null;

  const dismiss = (integration: IIntegration) => {
    // Only failures still showing are kept, so the stored map doesn't grow with integrations that recovered.
    const next = Object.fromEntries(
      failing
        .filter((item) => item._id === integration._id || dismissed[item._id] === failureKey(item))
        .map((item) => [item._id, failureKey(item)])
    );
    writeDismissed(storageKey, next);
    setVersion((value) => value + 1);
  };

  return (
    <div className="flex flex-col gap-2 px-2.5 pt-2.5">
      {visible.map((integration) => (
        <IntegrationHealthBanner
          key={integration._id}
          integration={integration}
          onDismiss={() => dismiss(integration)}
        />
      ))}
    </div>
  );
}

function IntegrationHealthBanner({ integration, onDismiss }: { integration: IIntegration; onDismiss: () => void }) {
  const navigate = useNavigate();
  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();
  const environment = environments?.find((env) => env._id === integration._environmentId);
  const isCurrent = integration._environmentId === currentEnvironment?._id;
  const date = formatHealthDate(integration.health?.failedAt);
  const environmentName = environment?.name ?? 'another environment';

  const act = () => {
    if (isCurrent) {
      navigate(buildRoute(ROUTES.INTEGRATIONS_UPDATE, { integrationId: integration._id }));

      return;
    }

    switchEnvironment(environment?.slug);
  };

  return (
    <div
      role="alert"
      className="bg-bg-white flex h-10 items-center gap-2 rounded-lg px-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]"
    >
      <ProviderIcon providerId={integration.providerId} providerDisplayName={integration.name} className="size-4" />
      <span className="bg-error-base/15 flex size-4 shrink-0 items-center justify-center rounded-full">
        <span className="bg-error-base size-1.5 rounded-full" />
      </span>
      <p className="text-label-sm min-w-0 flex-1 truncate">
        <span className="text-text-strong">
          {integration.name} can’t deliver to {environmentName}
        </span>
        <span className="text-text-soft ml-2 font-normal">
          {getHealthReason(integration)}
          {date ? ` on ${date}` : ''}
        </span>
      </p>
      <button
        type="button"
        onClick={act}
        className="text-label-xs text-error-base flex shrink-0 items-center gap-0.5 hover:underline"
      >
        {isCurrent ? 'Reconnect' : `Open ${environmentName}`}
        <RiArrowRightSLine className="size-3.5" />
      </button>
      <CompactButton
        variant="ghost"
        icon={RiCloseLine}
        size="md"
        onClick={onDismiss}
        aria-label={`Hide the ${integration.name} alert`}
      />
    </div>
  );
}
