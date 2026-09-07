import { type IIntegration } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiAlertLine, RiCheckLine, RiExpandUpDownLine } from 'react-icons/ri';
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
import type { ConnectorOption } from './connector-options';

const GROUP_HEADING_CLASSNAME =
  '**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1';

export type IntegrationDropdownStatus = 'idle' | 'valid' | 'missing';

type IntegrationDropdownProps = {
  connector: ConnectorOption;
  selectedIntegrationId?: string;
  integrations: IIntegration[] | undefined;
  status?: IntegrationDropdownStatus;
  showStatusBadge?: boolean;
  disabled?: boolean;
  setupLabel?: string;
  emptyLabel?: string;
  /** When true, demo credentials (e.g. `NovuAnthropic`) are hidden from the dropdown. */
  excludeDemo?: boolean;
  onSelectIntegration: (integration: IIntegration) => void;
  onRequestSetupCredentials: () => void;
};

function StatusBadge({ status }: { status: IntegrationDropdownStatus }) {
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

function TriggerGlyph({ status, showBadge }: { status: IntegrationDropdownStatus; showBadge: boolean }) {
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

export function IntegrationDropdown({
  connector,
  selectedIntegrationId,
  integrations,
  status = 'idle',
  showStatusBadge = false,
  disabled,
  setupLabel,
  emptyLabel = 'No integrations yet.',
  excludeDemo = false,
  onSelectIntegration,
  onRequestSetupCredentials,
}: IntegrationDropdownProps) {
  const [open, setOpen] = useState(false);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    prevOpenRef.current = open;
  }, [open]);

  const matchingIntegrations = useMemo(() => {
    if (!connector.providerId) return [];

    const all = getClaudeManagedAgentIntegrations(integrations, connector.providerId);

    return excludeDemo ? all.filter((integration) => !isDemoIntegration(integration.providerId)) : all;
  }, [integrations, connector.providerId, excludeDemo]);

  const selectedIntegration = useMemo(
    () => matchingIntegrations.find((i) => i._id === selectedIntegrationId),
    [matchingIntegrations, selectedIntegrationId]
  );

  const setupItemLabel = setupLabel ?? `Setup ${connector.providerLabel ?? 'provider'} credentials`;

  const renderTriggerSecondary = () => {
    if (!selectedIntegration) {
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
        className="border-stroke-weak bg-bg-weak min-w-0 max-w-full truncate rounded-sm border"
      >
        <span className="truncate">{selectedIntegration.name}</span>
      </Badge>
    );
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className="border-stroke-soft bg-bg-white flex h-8 w-full items-center justify-between overflow-hidden rounded-md border px-2 py-1 shadow-xs disabled:opacity-60"
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {connector.icon}
            <span className="text-text-strong text-label-xs shrink-0 font-medium leading-4">{connector.label}</span>
            {renderTriggerSecondary()}
          </div>
          <TriggerGlyph status={status} showBadge={showStatusBadge} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        portal={false}
        className="pointer-events-auto flex max-h-[min(360px,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) min-w-[320px] flex-col overflow-hidden p-0"
      >
        <Command shouldFilter={false} loop className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CommandList className="min-h-0 flex-1 overflow-y-auto p-1">
            <CommandEmpty className="text-text-soft text-label-xs py-4">{emptyLabel}</CommandEmpty>
            <CommandGroup className="p-0">
              <CommandItem
                value={`__setup-${connector.id}`}
                onSelect={() => {
                  onRequestSetupCredentials();
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-md p-1"
              >
                {connector.icon}
                <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                  {setupItemLabel}
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
                          {connector.icon}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
