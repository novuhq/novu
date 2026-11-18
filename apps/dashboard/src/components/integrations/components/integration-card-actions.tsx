import {
  CHANNELS_WITH_PRIMARY,
  ChannelTypeEnum,
  type IEnvironment,
  type IIntegration,
  PermissionsEnum,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ComponentType, type ReactNode, useState } from 'react';
import {
  RiDeleteBin2Line,
  RiEditBoxLine,
  RiFlashlightLine,
  RiMoreFill,
  RiShutDownLine,
  RiStackLine,
  RiStarLine,
} from 'react-icons/ri';
import { put } from '@/api/api.client';
import { deleteIntegration, setAsPrimaryIntegration } from '@/api/integrations';
import { ConfirmationModal } from '@/components/confirmation-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { EnvironmentBranchIcon } from '@/components/primitives/environment-branch-icon';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useHasPermission } from '@/hooks/use-has-permission';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import type { EnvironmentIntegration } from './integration-group-card';
import { DeleteIntegrationModal } from './modals/delete-integration-modal';
import { SelectPrimaryIntegrationModal } from './modals/select-primary-integration-modal';
import { hasRoutingConditions, isDemoIntegration } from './utils/helpers';

const MENU_CLASS =
  'bg-bg-weak min-w-[220px] rounded-xl border-0 p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08)]';
const ITEM_CLASS =
  'text-text-sub focus:text-text-strong data-[state=open]:text-text-strong h-7 gap-2 rounded px-2 py-0 text-[13px] leading-[1.1] focus:bg-[#f4f4f5] data-[state=open]:bg-[#f4f4f5] [&>svg]:size-[15px]';

type IconComponent = ComponentType<{ className?: string }>;

/**
 * Pauses or resumes an integration. Sends only `active`, so credentials and settings stay as they
 * are; the API picks a new primary when the primary is paused.
 */
function setIntegrationActive(integrationId: string, active: boolean, environment: IEnvironment) {
  return put<IIntegration>(`/integrations/${integrationId}`, { body: { active }, environment });
}

type IntegrationCardActionsProps = {
  /** The card's integration across its environments, development first. */
  items: EnvironmentIntegration[];
  /** The integration the card shows (its identifier is the one on the card). */
  selected: EnvironmentIntegration;
  onEdit: (item: EnvironmentIntegration) => void;
};

/**
 * The card's "…" menu. On a card that spans several environments, every action that changes one
 * integration first asks which environment, in a submenu.
 */
export function IntegrationCardActions({ items, selected, onEdit }: IntegrationCardActionsProps) {
  const has = useHasPermission();
  const queryClient = useQueryClient();
  const { integrations = [] } = useFetchIntegrations();
  const [pendingDelete, setPendingDelete] = useState<EnvironmentIntegration | null>(null);
  // Setting primary clears an integration's routing conditions; this holds the action awaiting that confirmation.
  const [conditionsLossAction, setConditionsLossAction] = useState<{ run: () => void } | null>(null);
  const [pendingPause, setPendingPause] = useState<EnvironmentIntegration | null>(null);

  const canWrite = has({ permission: PermissionsEnum.INTEGRATION_WRITE });
  const { integration } = selected;
  const supportsPrimary = !!integration.channel && CHANNELS_WITH_PRIMARY.includes(integration.channel);
  const isEmail = integration.channel === ChannelTypeEnum.EMAIL;
  // Same rule as the settings sheet: Inbox and Novu's demo providers can't be deleted.
  const canDelete = integration.channel !== ChannelTypeEnum.IN_APP && !isDemoIntegration(integration.providerId);

  /** Other active integrations on the same channel in the item's environment: candidates to take over as primary. */
  const otherActiveIn = (item: EnvironmentIntegration) =>
    integrations.filter(
      (other) =>
        other._id !== item.integration._id &&
        other.channel === item.integration.channel &&
        other.active &&
        other._environmentId === item.environment._id
    );

  const invalidate = () => {
    setConditionsLossAction(null);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
  };

  const { mutate: setActive } = useMutation({
    mutationFn: async ({
      item,
      active,
      newPrimaryId,
    }: {
      item: EnvironmentIntegration;
      active: boolean;
      newPrimaryId?: string;
    }) => {
      // Hand primary over first, so the channel keeps a primary while this one is paused.
      if (newPrimaryId) await setAsPrimaryIntegration(newPrimaryId, item.environment);

      return setIntegrationActive(item.integration._id, active, item.environment);
    },
    onSuccess: (_, { item, active }) =>
      showSuccessToast(`${item.integration.name} is ${active ? 'active' : 'paused'} in ${item.environment.name}.`),
    onError: (_, { item, active }) =>
      showErrorToast(`Couldn't ${active ? 'resume' : 'pause'} ${item.integration.name} in ${item.environment.name}.`),
    onSettled: () => {
      setPendingPause(null);
      invalidate();
    },
  });

  const { mutate: makePrimary } = useMutation({
    mutationFn: (item: EnvironmentIntegration) => setAsPrimaryIntegration(item.integration._id, item.environment),
    onSuccess: (_, item) =>
      showSuccessToast(`${item.integration.name} is now the primary integration in ${item.environment.name}.`),
    onError: (_, item) => showErrorToast(`Couldn't make ${item.integration.name} primary in ${item.environment.name}.`),
    onSettled: invalidate,
  });

  /** Runs `run`, after confirming first when the integration about to become primary has conditions. */
  const confirmConditionsLoss = (newPrimary: IIntegration | undefined, run: () => void) =>
    newPrimary && hasRoutingConditions(newPrimary) ? setConditionsLossAction({ run }) : run();

  const requestPrimary = (item: EnvironmentIntegration) =>
    confirmConditionsLoss(item.integration, () => makePrimary(item));

  /** A replacement primary picked while pausing or deleting the current one. */
  const replacement = (item: EnvironmentIntegration, newPrimaryId?: string) =>
    newPrimaryId ? otherActiveIn(item).find((other) => other._id === newPrimaryId) : undefined;

  // Pausing the primary leaves the channel without one, so pick its replacement first when there is one.
  const requestPause = (item: EnvironmentIntegration) =>
    supportsPrimary && item.integration.primary && otherActiveIn(item).length > 0
      ? setPendingPause(item)
      : setActive({ item, active: false });

  const { mutate: remove } = useMutation({
    mutationFn: async ({ item, newPrimaryId }: { item: EnvironmentIntegration; newPrimaryId?: string }) => {
      if (newPrimaryId) await setAsPrimaryIntegration(newPrimaryId, item.environment);

      return deleteIntegration({ id: item.integration._id, environment: item.environment });
    },
    onSuccess: (_, { item }) => showSuccessToast(`${item.integration.name} was deleted from ${item.environment.name}.`),
    onError: (_, { item }) => showErrorToast(`Couldn't delete ${item.integration.name} from ${item.environment.name}.`),
    onSettled: () => {
      setPendingDelete(null);
      invalidate();
    },
  });

  const copyIdentifier = async () => {
    try {
      await navigator.clipboard.writeText(integration.identifier);
      showSuccessToast('Identifier copied to clipboard.');
    } catch {
      showErrorToast("Couldn't copy the identifier.");
    }
  };

  // Several environments always ask which one, so the action never lands somewhere unexpected.
  const askForEnvironment = items.length > 1;
  const activeItems = items.filter((item) => item.integration.active);
  const pausedItems = items.filter((item) => !item.integration.active);
  const primaryCandidates = items.filter((item) => item.integration.active && !item.integration.primary);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Integration actions"
            // Collapsed to nothing until hover; -ml-3 cancels the row's gap so the status badge sits flush
            // right, then the button grows in and slides the star and status left.
            className={cn(
              'text-text-sub -ml-3 flex h-7 w-0 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f4f4f5] opacity-0',
              'transition-[width,margin,opacity] duration-200 ease-out',
              'group-hover:ml-0 group-hover:w-7 group-hover:opacity-100',
              'focus-visible:ml-0 focus-visible:w-7 focus-visible:opacity-100',
              'data-[state=open]:ml-0 data-[state=open]:w-7 data-[state=open]:opacity-100'
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <RiMoreFill className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={MENU_CLASS}>
          <EnvironmentAction
            icon={RiEditBoxLine}
            label="Edit configuration"
            targets={items}
            askForEnvironment={askForEnvironment}
            onSelect={onEdit}
            className="text-text-strong"
          />

          <Tooltip>
            <TooltipTrigger asChild>
              {/* Disabled items ignore the pointer, so the wrapper carries the tooltip. */}
              <div>
                <DropdownMenuItem className={ITEM_CLASS} disabled>
                  <RiFlashlightLine />
                  {isEmail ? 'Send a test email' : 'Send a test message'}
                </DropdownMenuItem>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">Coming soon</TooltipContent>
          </Tooltip>

          <DropdownMenuItem className={ITEM_CLASS} onSelect={copyIdentifier}>
            <RiStackLine />
            Copy identifier
          </DropdownMenuItem>

          {canWrite && supportsPrimary && (
            <EnvironmentAction
              icon={RiStarLine}
              label="Make primary"
              targets={primaryCandidates}
              askForEnvironment={askForEnvironment}
              onSelect={requestPrimary}
            />
          )}
          {canWrite && (
            <>
              <EnvironmentAction
                icon={RiShutDownLine}
                label="Pause"
                targets={activeItems}
                askForEnvironment={askForEnvironment}
                onSelect={requestPause}
              />
              <EnvironmentAction
                icon={RiShutDownLine}
                label="Resume"
                targets={pausedItems}
                askForEnvironment={askForEnvironment}
                onSelect={(item) => setActive({ item, active: true })}
              />
              {canDelete && (
                <>
                  <DropdownMenuSeparator className="bg-stroke-soft -mx-1 my-[3.5px]" />
                  <EnvironmentAction
                    icon={RiDeleteBin2Line}
                    label="Delete"
                    targets={items}
                    askForEnvironment={askForEnvironment}
                    onSelect={setPendingDelete}
                    className="text-error-base focus:text-error-base data-[state=open]:text-error-base"
                  />
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {pendingDelete && (
        <DeleteIntegrationModal
          isOpen
          onOpenChange={(open) => !open && setPendingDelete(null)}
          onConfirm={(newPrimaryId) =>
            confirmConditionsLoss(replacement(pendingDelete, newPrimaryId), () =>
              remove({ item: pendingDelete, newPrimaryId })
            )
          }
          isPrimary={pendingDelete.integration.primary}
          otherIntegrations={otherActiveIn(pendingDelete)}
        />
      )}

      <ConfirmationModal
        open={!!conditionsLossAction}
        onOpenChange={(open) => !open && setConditionsLossAction(null)}
        onConfirm={() => conditionsLossAction?.run()}
        title="Remove conditions?"
        description="A primary integration cannot have conditions. Making this integration primary will remove its conditions."
        confirmButtonText="Remove conditions"
      />

      {pendingPause && (
        <SelectPrimaryIntegrationModal
          isOpen
          onOpenChange={(open) => !open && setPendingPause(null)}
          onConfirm={(newPrimaryId) =>
            confirmConditionsLoss(replacement(pendingPause, newPrimaryId), () =>
              setActive({ item: pendingPause, active: false, newPrimaryId })
            )
          }
          otherIntegrations={otherActiveIn(pendingPause)}
          mode="select"
        />
      )}
    </>
  );
}

/** One menu item, or a submenu of environments when the card spans several. */
function EnvironmentAction({
  icon: Icon,
  label,
  targets,
  askForEnvironment,
  onSelect,
  className,
}: {
  icon: IconComponent;
  label: ReactNode;
  targets: EnvironmentIntegration[];
  askForEnvironment: boolean;
  onSelect: (item: EnvironmentIntegration) => void;
  className?: string;
}) {
  if (targets.length === 0) return null;

  if (!askForEnvironment) {
    return (
      <DropdownMenuItem className={cn(ITEM_CLASS, className)} onSelect={() => onSelect(targets[0])}>
        <Icon />
        {label}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(ITEM_CLASS, '[&>svg:last-child]:text-text-soft', className)}>
        <Icon />
        {label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className={cn(MENU_CLASS, 'min-w-[180px]')} sideOffset={6}>
        {targets.map((item) => (
          <DropdownMenuItem key={item.environment._id} className={ITEM_CLASS} onSelect={() => onSelect(item)}>
            <EnvironmentBranchIcon size="xs" environment={item.environment} className="rounded-[3px]" />
            <span className="truncate">{item.environment.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
