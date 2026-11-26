import {
  CHANNELS_WITH_PRIMARY,
  ChannelTypeEnum,
  type IEnvironment,
  type IIntegration,
  IntegrationConnectionStatusEnum,
  type ITestIntegrationConnectionResponse,
  PermissionsEnum,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
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
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showSuccessToast, showToast, showWarningToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useHasPermission } from '@/hooks/use-has-permission';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import { canVerifyIntegration, useVerifyIntegration } from './hooks/use-integration-verification';
import { useMakePrimary } from './hooks/use-make-primary';
import { showIntegrationDeletedToast } from './integration-deleted-toast';
import { DeleteIntegrationModal } from './modals/delete-integration-modal';
import { MakePrimaryModal } from './modals/make-primary-modal';
import { SelectPrimaryIntegrationModal } from './modals/select-primary-integration-modal';
import { hasRoutingConditions, isDemoIntegration } from './utils/helpers';
import { MENU_CLASS, MENU_ITEM_CLASS } from './utils/store-styles';

/** Pauses or resumes an integration. Sends only `active`, so credentials and settings stay as they are. */
function setIntegrationActive(integrationId: string, active: boolean, environment: IEnvironment) {
  return put<IIntegration>(`/integrations/${integrationId}`, { body: { active }, environment });
}

type IntegrationCardActionsProps = {
  /** An integration in the current environment. */
  integration: IIntegration;
  onEdit: () => void;
};

/** The card's "…" menu: quick actions on the integration, in the current environment. */
export function IntegrationCardActions({ integration, onEdit }: IntegrationCardActionsProps) {
  const has = useHasPermission();
  const queryClient = useQueryClient();
  const { currentEnvironment, environments = [] } = useEnvironment();
  const { integrations = [] } = useFetchIntegrations();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const makePrimary = useMakePrimary(integration);
  // Setting primary clears an integration's routing conditions; this holds the action awaiting that confirmation.
  const [conditionsLossAction, setConditionsLossAction] = useState<{ run: () => void } | null>(null);

  const canWrite = has({ permission: PermissionsEnum.INTEGRATION_WRITE }) && !!currentEnvironment;
  const supportsPrimary = !!integration.channel && CHANNELS_WITH_PRIMARY.includes(integration.channel);
  // Same rule as the settings sheet: Inbox and Novu's demo providers can't be deleted.
  const canDelete = integration.channel !== ChannelTypeEnum.IN_APP && !isDemoIntegration(integration.providerId);
  // Same rule as the drawer: only an active integration with provider credentials of its own.
  const canVerify = canWrite && integration.active && canVerifyIntegration(integration);
  // One toast per card, so the "Verifying…" toast is replaced by its result instead of stacking.
  const verifyToastId = `verify-integration-${useId()}`;

  /** The other integrations on the channel in this environment; the active ones can take over as primary. */
  const otherInChannel = integrations.filter(
    (other) =>
      other._id !== integration._id &&
      other.channel === integration.channel &&
      other._environmentId === integration._environmentId
  );
  const otherActive = otherInChannel.filter((other) => other.active);

  const settle = () => {
    setConditionsLossAction(null);
    setIsDeleteOpen(false);
    setIsPauseOpen(false);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
  };

  const { mutate: setActive } = useMutation({
    mutationFn: async ({ active, newPrimaryId }: { active: boolean; newPrimaryId?: string }) => {
      if (!currentEnvironment) throw new Error('No environment selected');
      // Hand primary over first, so the channel keeps a primary while this one is paused.
      if (newPrimaryId) await setAsPrimaryIntegration(newPrimaryId, currentEnvironment);

      return setIntegrationActive(integration._id, active, currentEnvironment);
    },
    onSuccess: (_, { active }) => showSuccessToast(`${integration.name} is ${active ? 'active' : 'paused'}.`),
    onError: (_, { active }) => showErrorToast(`Couldn't ${active ? 'resume' : 'pause'} ${integration.name}.`),
    onSettled: settle,
  });

  const verifyIntegration = useVerifyIntegration();
  const { mutate: verify, isPending: isVerifying } = useMutation({
    mutationFn: () => verifyIntegration(integration),
    onMutate: () =>
      showToast({
        children: () => (
          <>
            <ToastIcon variant="default" className="animate-spin" />
            <span className="text-sm">Verifying {integration.name}…</span>
          </>
        ),
        options: { id: verifyToastId, duration: Number.POSITIVE_INFINITY },
      }),
    onSuccess: (result) => handleConnectionResult(result),
    onError: () => showErrorToast(`Couldn't verify ${integration.name}. Try again.`, undefined, { id: verifyToastId }),
  });

  /** Shows the outcome of the check. */
  const handleConnectionResult = ({ status, message }: ITestIntegrationConnectionResponse) => {
    const toastOptions = { id: verifyToastId, duration: 8_000 };

    switch (status) {
      case IntegrationConnectionStatusEnum.VALID:
        return showSuccessToast(`${integration.name} is verified. ${message}`, undefined, toastOptions);
      case IntegrationConnectionStatusEnum.INVALID:
        return showErrorToast(
          `${message} ${integration.name} didn't pass verification. Update its credentials in Edit configuration.`,
          'Verification failed',
          { id: verifyToastId, duration: 10_000 }
        );
      case IntegrationConnectionStatusEnum.UNREACHABLE:
        return showWarningToast(
          `${message} Nothing was changed. Try again in a few minutes.`,
          'Provider unreachable',
          toastOptions
        );
      case IntegrationConnectionStatusEnum.UNSUPPORTED:
        return showToast({
          children: () => (
            <>
              <ToastIcon variant="info" />
              <span className="text-sm">{message}</span>
            </>
          ),
          options: toastOptions,
        });
      default:
        return showWarningToast(`${message} Nothing was changed.`, 'Verification inconclusive', toastOptions);
    }
  };

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: async (newPrimaryId?: string) => {
      if (!currentEnvironment) throw new Error('No environment selected');
      if (newPrimaryId) await setAsPrimaryIntegration(newPrimaryId, currentEnvironment);

      return deleteIntegration({ id: integration._id, environment: currentEnvironment });
    },
    onSuccess: (_, newPrimaryId) =>
      showIntegrationDeletedToast({ integration, newPrimary: findReplacement(newPrimaryId) }),
    onError: () => showErrorToast(`Couldn't delete ${integration.name}.`),
    onSettled: settle,
  });

  /** Runs `run`, after confirming first when the integration about to become primary has conditions. */
  const confirmConditionsLoss = (newPrimary: IIntegration | undefined, run: () => void) =>
    newPrimary && hasRoutingConditions(newPrimary) ? setConditionsLossAction({ run }) : run();
  const findReplacement = (newPrimaryId?: string) => otherActive.find((other) => other._id === newPrimaryId);

  // Pausing the primary leaves the channel without one, so pick its replacement first when there is one.
  const requestPause = () =>
    supportsPrimary && integration.primary && otherActive.length > 0
      ? setIsPauseOpen(true)
      : setActive({ active: false });

  const copyIdentifier = async () => {
    try {
      await navigator.clipboard.writeText(integration.identifier);
      showSuccessToast('Identifier copied to clipboard.');
    } catch {
      showErrorToast("Couldn't copy the identifier.");
    }
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Integration actions"
            // Collapsed to nothing until hover; -ml-3 cancels the row's gap so the star sits flush right,
            // then the button grows in and slides the star left.
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
        <DropdownMenuContent align="end" className={cn(MENU_CLASS, 'min-w-[220px]')}>
          <DropdownMenuItem className={cn(MENU_ITEM_CLASS, 'text-text-strong')} onSelect={onEdit}>
            <RiEditBoxLine />
            Edit configuration
          </DropdownMenuItem>

          {canVerify && (
            <DropdownMenuItem className={MENU_ITEM_CLASS} disabled={isVerifying} onSelect={() => verify()}>
              <RiFlashlightLine />
              {isVerifying ? 'Verifying integration…' : 'Verify integration'}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={copyIdentifier}>
            <RiStackLine />
            Copy identifier
          </DropdownMenuItem>

          {canWrite && supportsPrimary && integration.active && !integration.primary && (
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={makePrimary.open}>
              <RiStarLine />
              Make primary
            </DropdownMenuItem>
          )}
          {canWrite && (
            <DropdownMenuItem
              className={MENU_ITEM_CLASS}
              onSelect={() => (integration.active ? requestPause() : setActive({ active: true }))}
            >
              <RiShutDownLine />
              {integration.active ? 'Pause' : 'Resume'}
            </DropdownMenuItem>
          )}
          {canWrite && canDelete && (
            <>
              <DropdownMenuSeparator className="bg-stroke-soft -mx-1 my-[3.5px]" />
              <DropdownMenuItem
                className={cn(MENU_ITEM_CLASS, 'text-error-base focus:text-error-base')}
                onSelect={() => setIsDeleteOpen(true)}
              >
                <RiDeleteBin2Line />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <MakePrimaryModal
        isOpen={makePrimary.isOpen}
        newPrimaryName={integration.name}
        currentPrimaryName={otherInChannel.find((other) => other.primary)?.name}
        channel={integration.channel}
        environment={currentEnvironment}
        environments={environments}
        // The modal says the conditions go, so it doesn't need the separate "Remove conditions?" step.
        removesConditions={hasRoutingConditions(integration)}
        isLoading={makePrimary.isPending}
        centerOn="page"
        onCancel={makePrimary.close}
        onConfirm={makePrimary.confirm}
      />

      <DeleteIntegrationModal
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={(newPrimaryId) => confirmConditionsLoss(findReplacement(newPrimaryId), () => remove(newPrimaryId))}
        integration={integration}
        channelIntegrations={otherInChannel}
        isLoading={isDeleting}
      />

      {isPauseOpen && (
        <SelectPrimaryIntegrationModal
          isOpen
          onOpenChange={setIsPauseOpen}
          onConfirm={(newPrimaryId) =>
            confirmConditionsLoss(findReplacement(newPrimaryId), () => setActive({ active: false, newPrimaryId }))
          }
          otherIntegrations={otherActive}
          mode="select"
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
    </>
  );
}
