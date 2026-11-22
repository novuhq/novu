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
import {
  deleteIntegration,
  getIntegrations,
  setAsPrimaryIntegration,
  testIntegrationConnection,
} from '@/api/integrations';
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
import { DeleteIntegrationModal } from './modals/delete-integration-modal';
import { SelectPrimaryIntegrationModal } from './modals/select-primary-integration-modal';
import { hasRoutingConditions, isDemoIntegration } from './utils/helpers';

const MENU_CLASS =
  'bg-bg-weak min-w-[220px] rounded-xl border-0 p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08)]';
const ITEM_CLASS =
  'text-text-sub focus:text-text-strong h-7 gap-2 rounded px-2 py-0 text-[13px] leading-[1.1] focus:bg-[#f4f4f5] [&>svg]:size-[15px]';

/** Pauses or resumes an integration. Sends only `active`, so credentials and settings stay as they are. */
function setIntegrationActive(integrationId: string, active: boolean, environment: IEnvironment) {
  return put<IIntegration>(`/integrations/${integrationId}`, { body: { active }, environment });
}

type PauseReason = 'manual' | 'invalid-credentials';

type IntegrationCardActionsProps = {
  /** An integration in the current environment. */
  integration: IIntegration;
  onEdit: () => void;
};

/** The card's "…" menu: quick actions on the integration, in the current environment. */
export function IntegrationCardActions({ integration, onEdit }: IntegrationCardActionsProps) {
  const has = useHasPermission();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const { integrations = [] } = useFetchIntegrations();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  // Setting primary clears an integration's routing conditions; this holds the action awaiting that confirmation.
  const [conditionsLossAction, setConditionsLossAction] = useState<{ run: () => void } | null>(null);

  const canWrite = has({ permission: PermissionsEnum.INTEGRATION_WRITE }) && !!currentEnvironment;
  const supportsPrimary = !!integration.channel && CHANNELS_WITH_PRIMARY.includes(integration.channel);
  // Same rule as the settings sheet: Inbox and Novu's demo providers can't be deleted.
  const canDelete = integration.channel !== ChannelTypeEnum.IN_APP && !isDemoIntegration(integration.providerId);
  // Inbox has no provider credentials, and Novu owns the demo providers' credentials.
  const canTestConnection = canWrite && canDelete;
  // One toast per card, so the "Testing…" toast is replaced by its result instead of stacking.
  const testToastId = `test-connection-${useId()}`;
  const [pauseReason, setPauseReason] = useState<PauseReason>('manual');

  /** Other active integrations on the channel: candidates to take over as primary. */
  const otherActive = integrations.filter(
    (other) =>
      other._id !== integration._id &&
      other.channel === integration.channel &&
      other.active &&
      other._environmentId === integration._environmentId
  );

  const settle = () => {
    setConditionsLossAction(null);
    setIsDeleteOpen(false);
    setIsPauseOpen(false);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
  };

  const { mutate: setActive } = useMutation({
    mutationFn: async ({ active, newPrimaryId }: { active: boolean; newPrimaryId?: string; reason?: PauseReason }) => {
      if (!currentEnvironment) throw new Error('No environment selected');
      // Hand primary over first, so the channel keeps a primary while this one is paused.
      if (newPrimaryId) await setAsPrimaryIntegration(newPrimaryId, currentEnvironment);

      return setIntegrationActive(integration._id, active, currentEnvironment);
    },
    onSuccess: (_, { active, reason }) =>
      reason === 'invalid-credentials'
        ? showErrorToast(
            `The provider rejected ${integration.name}'s credentials, so it was paused. Update them in Edit configuration, then resume it.`,
            'Integration paused',
            { id: testToastId, duration: 10_000 }
          )
        : showSuccessToast(`${integration.name} is ${active ? 'active' : 'paused'}.`),
    onError: (_, { active, reason }) =>
      reason === 'invalid-credentials'
        ? showErrorToast(
            `The provider rejected ${integration.name}'s credentials, but pausing it failed. Pause it manually.`,
            undefined,
            { id: testToastId }
          )
        : showErrorToast(`Couldn't ${active ? 'resume' : 'pause'} ${integration.name}.`),
    onSettled: settle,
  });

  const { mutate: testConnection, isPending: isTestingConnection } = useMutation({
    mutationFn: async () => {
      if (!currentEnvironment) throw new Error('No environment selected');

      return testIntegrationConnection(integration._id, currentEnvironment);
    },
    onMutate: () =>
      showToast({
        children: () => (
          <>
            <ToastIcon variant="default" className="animate-spin" />
            <span className="text-sm">Verifying {integration.name}…</span>
          </>
        ),
        options: { id: testToastId, duration: Number.POSITIVE_INFINITY },
      }),
    onSuccess: (result) => handleConnectionResult(result),
    onError: () => showErrorToast(`Couldn't verify ${integration.name}. Try again.`, undefined, { id: testToastId }),
  });

  /**
   * Pauses after rejected credentials, but only if the integration is still the revision that was tested:
   * if someone saved new credentials while the check ran, the result is stale and nothing is paused.
   */
  const pauseIfUnchanged = async (revision: string | undefined, message: string) => {
    const toastOptions = { id: testToastId, duration: 10_000 };
    let fresh: IIntegration | undefined;

    try {
      if (!currentEnvironment) throw new Error('No environment selected');
      const latest = await queryClient.fetchQuery({
        queryKey: [QueryKeys.fetchIntegrations, currentEnvironment._id],
        queryFn: () => getIntegrations({ environment: currentEnvironment }),
        staleTime: 0,
      });
      fresh = latest.find((candidate) => candidate._id === integration._id);
    } catch {
      return showErrorToast(
        `${message} Couldn't confirm ${integration.name} is unchanged, so it wasn't paused. Pause it manually.`,
        'Credentials rejected',
        toastOptions
      );
    }

    const freshUpdatedAt = (fresh as (IIntegration & { updatedAt?: string }) | undefined)?.updatedAt;
    const isSameRevision = !revision || !freshUpdatedAt || new Date(freshUpdatedAt).toISOString() === revision;

    if (!fresh || !isSameRevision) {
      return showWarningToast(
        `${integration.name} changed while it was being verified, so it wasn't paused. Verify it again.`,
        'Verification out of date',
        toastOptions
      );
    }

    if (!fresh.active) {
      return showErrorToast(`${message} ${integration.name} is already paused.`, 'Credentials rejected', toastOptions);
    }

    requestPause('invalid-credentials');
  };

  /** Shows the outcome; on confirmed-invalid credentials, pauses the integration through the regular Pause flow. */
  const handleConnectionResult = ({ status, message, revision }: ITestIntegrationConnectionResponse) => {
    const toastOptions = { id: testToastId, duration: 8_000 };

    switch (status) {
      case IntegrationConnectionStatusEnum.VALID:
        return showSuccessToast(`${integration.name} is verified. ${message}`, undefined, toastOptions);
      case IntegrationConnectionStatusEnum.INVALID:
        return pauseIfUnchanged(revision, message);
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

  const { mutate: makePrimary } = useMutation({
    mutationFn: async () => {
      if (!currentEnvironment) throw new Error('No environment selected');

      return setAsPrimaryIntegration(integration._id, currentEnvironment);
    },
    onSuccess: () => showSuccessToast(`${integration.name} is now the primary integration.`),
    onError: () => showErrorToast(`Couldn't make ${integration.name} the primary integration.`),
    onSettled: settle,
  });

  const { mutate: remove } = useMutation({
    mutationFn: async (newPrimaryId?: string) => {
      if (!currentEnvironment) throw new Error('No environment selected');
      if (newPrimaryId) await setAsPrimaryIntegration(newPrimaryId, currentEnvironment);

      return deleteIntegration({ id: integration._id, environment: currentEnvironment });
    },
    onSuccess: () => showSuccessToast(`${integration.name} was deleted.`),
    onError: () => showErrorToast(`Couldn't delete ${integration.name}.`),
    onSettled: settle,
  });

  /** Runs `run`, after confirming first when the integration about to become primary has conditions. */
  const confirmConditionsLoss = (newPrimary: IIntegration | undefined, run: () => void) =>
    newPrimary && hasRoutingConditions(newPrimary) ? setConditionsLossAction({ run }) : run();
  const findReplacement = (newPrimaryId?: string) => otherActive.find((other) => other._id === newPrimaryId);

  // Pausing the primary leaves the channel without one, so pick its replacement first when there is one.
  const requestPause = (reason: PauseReason = 'manual') => {
    setPauseReason(reason);

    if (supportsPrimary && integration.primary && otherActive.length > 0) {
      if (reason === 'invalid-credentials') {
        showErrorToast(
          `The provider rejected ${integration.name}'s credentials. Pick the integration that takes over as primary, and ${integration.name} will be paused.`,
          'Credentials rejected',
          { id: testToastId, duration: 10_000 }
        );
      }

      return setIsPauseOpen(true);
    }

    setActive({ active: false, reason });
  };

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
        <DropdownMenuContent align="end" className={MENU_CLASS}>
          <DropdownMenuItem className={cn(ITEM_CLASS, 'text-text-strong')} onSelect={onEdit}>
            <RiEditBoxLine />
            Edit configuration
          </DropdownMenuItem>

          {canTestConnection && (
            <DropdownMenuItem className={ITEM_CLASS} disabled={isTestingConnection} onSelect={() => testConnection()}>
              <RiFlashlightLine />
              {isTestingConnection ? 'Verifying integration…' : 'Verify integration'}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem className={ITEM_CLASS} onSelect={copyIdentifier}>
            <RiStackLine />
            Copy identifier
          </DropdownMenuItem>

          {canWrite && supportsPrimary && integration.active && !integration.primary && (
            <DropdownMenuItem
              className={ITEM_CLASS}
              onSelect={() => confirmConditionsLoss(integration, () => makePrimary())}
            >
              <RiStarLine />
              Make primary
            </DropdownMenuItem>
          )}
          {canWrite && (
            <DropdownMenuItem
              className={ITEM_CLASS}
              onSelect={() => (integration.active ? requestPause('manual') : setActive({ active: true }))}
            >
              <RiShutDownLine />
              {integration.active ? 'Pause' : 'Resume'}
            </DropdownMenuItem>
          )}
          {canWrite && canDelete && (
            <>
              <DropdownMenuSeparator className="bg-stroke-soft -mx-1 my-[3.5px]" />
              <DropdownMenuItem
                className={cn(ITEM_CLASS, 'text-error-base focus:text-error-base')}
                onSelect={() => setIsDeleteOpen(true)}
              >
                <RiDeleteBin2Line />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteIntegrationModal
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={(newPrimaryId) => confirmConditionsLoss(findReplacement(newPrimaryId), () => remove(newPrimaryId))}
        isPrimary={integration.primary}
        otherIntegrations={otherActive}
      />

      {isPauseOpen && (
        <SelectPrimaryIntegrationModal
          isOpen
          onOpenChange={setIsPauseOpen}
          onConfirm={(newPrimaryId) =>
            confirmConditionsLoss(findReplacement(newPrimaryId), () =>
              setActive({ active: false, newPrimaryId, reason: pauseReason })
            )
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
