import { type IIntegration } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiAlertLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiExpandUpDownLine,
} from 'react-icons/ri';
import {
  DemoCredentialBadge,
  DemoCredentialDropdownItem,
} from '@/components/integrations/components/demo-credential-badge';
import { isDemoIntegration } from '@/components/integrations/components/utils/helpers';
import { Badge } from '@/components/primitives/badge';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { getClaudeManagedAgentIntegrations } from './claude-managed-integrations';
import { CONNECTOR_OPTIONS, type ConnectorId, type ConnectorOption, getConnectorById } from './connector-options';

const GROUP_HEADING_CLASSNAME =
  '**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1';

export type ConnectorIntegrationStatus = 'idle' | 'valid' | 'missing';

type ConnectorIntegrationDropdownProps = {
  selectedConnectorId: ConnectorId;
  selectedIntegrationId?: string;
  integrations: IIntegration[] | undefined;
  status?: ConnectorIntegrationStatus;
  showStatusBadge?: boolean;
  disabled?: boolean;
  onSelectConnector: (id: ConnectorId) => void;
  onSelectIntegration: (integration: IIntegration) => void;
  onRequestSetupCredentials: (option: ConnectorOption) => void;
};

function StatusBadge({ status }: { status: ConnectorIntegrationStatus }) {
  if (status === 'valid') {
    return (
      <span className="bg-success-base flex size-3.5 items-center justify-center rounded-full">
        <RiCheckLine className="text-static-white size-2.5" aria-hidden />
      </span>
    );
  }

  if (status === 'missing') {
    return <RiAlertLine className="text-warning-base size-3.5" aria-hidden />;
  }

  return null;
}

function TriggerGlyph({ status, showBadge }: { status: ConnectorIntegrationStatus; showBadge: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <AnimatePresence initial={false}>
        {showBadge && status !== 'idle' ? (
          <motion.span
            key="status-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center"
          >
            <StatusBadge status={status} />
          </motion.span>
        ) : null}
      </AnimatePresence>
      <RiExpandUpDownLine className="text-text-soft size-3.5" aria-hidden />
    </span>
  );
}

export function ConnectorIntegrationDropdown({
  selectedConnectorId,
  selectedIntegrationId,
  integrations,
  status = 'idle',
  showStatusBadge = false,
  disabled,
  onSelectConnector,
  onSelectIntegration,
  onRequestSetupCredentials,
}: ConnectorIntegrationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'connectors' | 'integrations'>('integrations');

  const selectedConnector = getConnectorById(selectedConnectorId);

  const matchingIntegrations = useMemo(() => {
    if (!selectedConnector?.providerId) return [];

    return getClaudeManagedAgentIntegrations(integrations, selectedConnector.providerId);
  }, [integrations, selectedConnector?.providerId]);

  const selectedIntegration = useMemo(
    () => matchingIntegrations.find((i) => i._id === selectedIntegrationId),
    [matchingIntegrations, selectedIntegrationId]
  );

  // Reset the view only when the popover transitions from closed → open, so that internal
  // navigation (back arrow → connectors → pick connector → integrations) is preserved.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open || wasOpen) return;
    setView(selectedConnector?.providerId ? 'integrations' : 'connectors');
  }, [open, selectedConnector?.providerId]);

  const externalOptions = CONNECTOR_OPTIONS.filter((o) => o.group === 'external');
  const customOptions = CONNECTOR_OPTIONS.filter((o) => o.group === 'custom');

  const handlePickConnector = (option: ConnectorOption) => {
    const isDisabled = option.comingSoon || !option.runtime;
    if (isDisabled) return;

    onSelectConnector(option.id);

    if (option.providerId) {
      setView('integrations');

      return;
    }

    setOpen(false);
  };

  const renderConnectorItem = (option: ConnectorOption) => {
    const isDisabled = option.comingSoon || !option.runtime;
    const isCurrent = selectedConnectorId === option.id;
    const hasSubmenu = Boolean(option.providerId) && !isDisabled;

    return (
      <CommandItem
        key={option.id}
        value={`connector-${option.id}`}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        onSelect={() => handlePickConnector(option)}
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-md p-1 cursor-pointer',
          isCurrent && 'bg-bg-muted',
          isDisabled && 'pointer-events-auto! opacity-60 cursor-not-allowed'
        )}
      >
        <div className="flex w-full min-w-0 items-center gap-1.5 break-normal">
          {option.icon}
          <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
            {option.label}
          </span>
          {option.comingSoon ? (
            <Badge color="gray" variant="lighter" size="sm">
              coming soon
            </Badge>
          ) : null}
          {hasSubmenu ? <RiArrowRightSLine className="text-text-soft size-3.5 shrink-0" aria-hidden /> : null}
        </div>
      </CommandItem>
    );
  };

  const renderTriggerSecondary = () => {
    if (!selectedConnector?.providerId || !selectedIntegration) {
      return null;
    }

    if (isDemoIntegration(selectedIntegration.providerId)) {
      return <DemoCredentialBadge className="min-w-0 max-w-full" />;
    }

    return (
      <Badge
        color="gray"
        variant="lighter"
        size="md"
        className="min-w-0 max-w-full truncate bg-bg-weak border-stroke-weak border rounded-sm"
      >
        <span className="truncate">{selectedIntegration.name}</span>
      </Badge>
    );
  };

  const connectorsView = (
    <>
      <CommandGroup heading="External connectors" className={GROUP_HEADING_CLASSNAME}>
        {externalOptions.map(renderConnectorItem)}
      </CommandGroup>
      <CommandGroup heading="Custom code" className={GROUP_HEADING_CLASSNAME}>
        {customOptions.map(renderConnectorItem)}
      </CommandGroup>
    </>
  );

  const integrationsView = selectedConnector ? (
    <>
      <CommandGroup className="p-1">
        <CommandItem
          value="__back"
          onSelect={() => setView('connectors')}
          className="text-text-sub hover:bg-bg-weak data-[selected=true]:bg-bg-weak flex items-center gap-1 rounded-md px-1 py-1 text-label-xs cursor-pointer"
        >
          <RiArrowLeftSLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
          {selectedConnector.icon}
          <span className="text-text-sub text-label-xs font-medium leading-4 flex-1">{selectedConnector.label}</span>
        </CommandItem>

        <CommandItem
          value={`__setup-${selectedConnector.id}`}
          onSelect={() => {
            onRequestSetupCredentials(selectedConnector);
            setOpen(false);
          }}
          className="flex items-center gap-1.5 rounded-md p-1 cursor-pointer mt-0.5"
        >
          {selectedConnector.icon}
          <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
            Setup {selectedConnector.providerLabel ?? 'provider'} credentials
          </span>
          <RiAddLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
        </CommandItem>
      </CommandGroup>

      {matchingIntegrations.length > 0 ? (
        <CommandGroup heading="Existing" className={GROUP_HEADING_CLASSNAME}>
          {matchingIntegrations.map((integration) => {
            const isCurrent = integration._id === selectedIntegrationId;
            const isDemo = isDemoIntegration(integration.providerId);

            return (
              <CommandItem
                key={integration._id}
                value={`integration-${integration._id}`}
                onSelect={() => {
                  onSelectIntegration(integration);
                  setOpen(false);
                }}
                className="flex min-w-0 cursor-pointer p-0"
              >
                {isDemo ? (
                  <DemoCredentialDropdownItem
                    providerId={integration.providerId}
                    providerDisplayName={integration.name}
                    isSelected={isCurrent}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex w-full min-w-0 items-center gap-1.5 break-normal p-1',
                      isCurrent && 'bg-bg-muted'
                    )}
                  >
                    {selectedConnector.icon}
                    <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                      {integration.name}
                    </span>
                    <span className="text-text-soft text-label-xs shrink-0 truncate font-mono">
                      {integration.identifier}
                    </span>
                  </div>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      ) : null}
    </>
  ) : null;

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className="border-stroke-soft bg-bg-white flex h-8 w-full items-center justify-between overflow-hidden rounded-md border px-2 py-1 shadow-xs disabled:opacity-60"
        >
          {selectedConnector ? (
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {selectedConnector.icon}
              <span className="text-text-strong text-label-xs shrink-0 font-medium leading-4">
                {selectedConnector.label}
              </span>
              {renderTriggerSecondary()}
            </div>
          ) : (
            <span className="text-text-soft text-label-xs font-medium leading-4">Select connector…</span>
          )}
          <TriggerGlyph status={status} showBadge={showStatusBadge} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        portal={false}
        className="pointer-events-auto flex max-h-[min(360px,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) min-w-[320px] flex-col overflow-hidden p-0"
      >
        <Command key={view} shouldFilter={false} loop className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CommandList className="min-h-0 flex-1 overflow-y-auto p-1">
            <CommandEmpty className="text-text-soft text-label-xs py-4">No options found.</CommandEmpty>
            {view === 'connectors' ? connectorsView : integrationsView}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
