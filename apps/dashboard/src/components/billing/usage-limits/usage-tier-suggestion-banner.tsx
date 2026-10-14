import { useMemo, useState } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { TierSuggestionBanner, type TierSuggestionSource } from './tier-suggestion-card';
import { getUsageTierSuggestion, type TierSuggestion } from './usage-limits-form-values';
import { useUsageLimitsView } from './use-usage-limits-view';

function getDismissStorageKey(organizationId: string, kind: TierSuggestion['kind'], resetsAt: string | null): string {
  return `novu-usage-tier-suggestion-dismissed:${organizationId}:${kind}:${resetsAt ?? 'none'}`;
}

/** Storage access throws in some private browsing modes and when the quota is full. */
function readDismissed(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

function writeDismissed(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, 'true');
  } catch {
    // The dismissal still holds for this page view.
  }
}

/** Without a key nothing is persisted, so the suggestion always shows. */
function useDismissedFlag(storageKey: string | null): [boolean, () => void] {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const isStored = useMemo(() => storageKey !== null && readDismissed(storageKey), [storageKey]);

  const dismiss = () => {
    if (storageKey === null) {
      return;
    }

    writeDismissed(storageKey);
    setDismissedKey(storageKey);
  };

  return [isStored || (storageKey !== null && dismissedKey === storageKey), dismiss];
}

type UsageTierSuggestionBannerProps = {
  source: TierSuggestionSource;
  onComparePlans: () => void;
};

/**
 * Suggests the next tier once this cycle's plan price plus on-demand usage passes it. Billing admins only, since
 * members cannot change the plan. Dismissal lasts for the current billing cycle and suggestion.
 */
export function UsageTierSuggestionBanner({ source, onComparePlans }: UsageTierSuggestionBannerProps) {
  const view = useUsageLimitsView();
  const { currentOrganization } = useAuth();
  const suggestion =
    view &&
    getUsageTierSuggestion({
      apiServiceLevel: view.plan.apiServiceLevel,
      isOnTrial: view.plan.isOnTrial,
      current: view.usage.current,
      included: view.usage.included,
      onDemandPricePer1k: view.usage.onDemandPricePer1k,
    });
  const storageKey =
    suggestion && currentOrganization?._id
      ? getDismissStorageKey(currentOrganization._id, suggestion.kind, view.usage.resetsAt)
      : null;
  const [isDismissed, dismiss] = useDismissedFlag(storageKey);

  if (!view?.canEdit || !suggestion || isDismissed) {
    return null;
  }

  return (
    <TierSuggestionBanner
      suggestion={suggestion}
      billingInterval={view.plan.billingInterval}
      source={source}
      onComparePlans={onComparePlans}
      onDismiss={dismiss}
    />
  );
}
