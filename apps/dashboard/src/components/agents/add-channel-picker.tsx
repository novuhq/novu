import type { IIntegration } from '@novu/shared';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import type { AgentIntegrationLink } from '@/api/agents';
import type { PlanUsage } from '@/api/agents-plan-usage';
import { ChannelLimitUpgradeDialog } from './plan-limit-upgrade-dialog';
import { ProviderDropdown } from './provider-dropdown';

type AddChannelPickerProps = {
  agentIdentifier: string;
  agentName?: string;
  links: AgentIntegrationLink[];
  planUsage?: PlanUsage;
  selectedIntegrationId?: string;
  excludeLinked?: boolean;
  renderTrigger: (props: { isBusy: boolean }) => ReactNode;
  onSelected: (providerId: string, integration?: IIntegration) => void;
};

export function AddChannelPicker({
  agentIdentifier,
  agentName,
  links,
  planUsage,
  selectedIntegrationId,
  excludeLinked = true,
  renderTrigger,
  onSelected,
}: AddChannelPickerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Deferred link to run when the user accepts the channel-limit warning ("Add
  // anyway"). Intentionally not cleared on dialog dismissal: the dialog fires
  // onOpenChange(false) before onContinueAnyway, so clearing on close would
  // race-null this ref before handleContinueAnyway can read it. It's always
  // re-set in handleConfirmRequired before the dialog reopens, so a dismissed
  // dialog never leaves a stale link that could fire.
  const pendingLinkRef = useRef<(() => void) | null>(null);

  const linkedIntegrationIds = useMemo(() => new Set(links.map((row) => row.integration._id)), [links]);

  const isAtChannelLimit = Boolean(planUsage && planUsage.used >= planUsage.limit);

  // Providers that already occupy a within-limit active-channel slot. Adding
  // another integration of one of these (e.g. a second Slack workspace) does not
  // consume a new slot, so it must not trigger the channel-limit warning.
  const connectedWithinLimitProviderIds = useMemo(
    () =>
      new Set(
        links
          .filter((row) => Boolean(row.connectedAt) && !row.exceedsPlanLimit)
          .map((row) => row.integration.providerId)
      ),
    [links]
  );

  const confirmBeforeLink = (providerId: string) => {
    if (!isAtChannelLimit) {
      return false;
    }

    return !connectedWithinLimitProviderIds.has(providerId);
  };

  const handleConfirmRequired = (proceed: () => void) => {
    pendingLinkRef.current = proceed;
    setDropdownOpen(false);
    setDialogOpen(true);
  };

  const handleContinueAnyway = () => {
    const proceed = pendingLinkRef.current;
    pendingLinkRef.current = null;
    setDialogOpen(false);
    proceed?.();
  };

  return (
    <>
      <ProviderDropdown
        agentIdentifier={agentIdentifier}
        agentName={agentName}
        selectedIntegrationId={selectedIntegrationId}
        linkedIntegrationIds={linkedIntegrationIds}
        excludeLinked={excludeLinked}
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        onSelect={onSelected}
        confirmBeforeLink={confirmBeforeLink}
        onConfirmRequired={handleConfirmRequired}
        renderTrigger={renderTrigger}
      />
      {planUsage ? (
        <ChannelLimitUpgradeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          planUsage={planUsage}
          onContinueAnyway={handleContinueAnyway}
        />
      ) : null}
    </>
  );
}
