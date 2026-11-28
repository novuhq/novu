import {
  ChannelTypeEnum,
  CopilotPageEnum,
  CopilotViewingResourceEnum,
  FeatureFlagsKeysEnum,
  type IEnvironment,
  type IIntegration,
  providers as novuProviders,
  PermissionsEnum,
} from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRegisterCopilotPageView } from '@/components/copilot-web-chat';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useSetPrimaryIntegration } from '@/hooks/use-set-primary-integration';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { buildRoute } from '@/utils/routes';
import { showErrorToast, showSuccessToast } from '../../../components/primitives/sonner-helpers';
import { useDeleteIntegration } from '../../../hooks/use-delete-integration';
import { ROUTES } from '../../../utils/routes';
import { IntegrationFormData } from '../types';
import { getDuplicateTargets, shouldCopySecrets, useDuplicateIntegration } from './hooks/use-duplicate-integration';
import { useIntegrationPrimaryModal } from './hooks/use-integration-primary-modal';
import {
  canVerifyIntegration,
  getIntegrationVerificationQueryKey,
  useIntegrationVerification,
} from './hooks/use-integration-verification';
import { useMakePrimary } from './hooks/use-make-primary';
import { showIntegrationDeletedToast } from './integration-deleted-toast';
import { IntegrationSettings } from './integration-settings';
import { IntegrationSheet } from './integration-sheet';
import {
  EnvironmentTitle,
  IntegrationDetailsPanel,
  ManageIntegrationFooter,
  ManageIntegrationHeader,
  ProviderGuideLink,
  VerificationBanner,
} from './manage-integration-drawer';
import { DeleteIntegrationModal } from './modals/delete-integration-modal';
import { DiscardChangesModal } from './modals/discard-changes-modal';
import { MakePrimaryModal } from './modals/make-primary-modal';
import { SelectPrimaryIntegrationModal } from './modals/select-primary-integration-modal';
import { handleIntegrationError } from './utils/handle-integration-error';
import { cleanCredentials, hasRoutingConditions, isDemoIntegration } from './utils/helpers';

/** Tells the Copilot which integration's sheet is open. */
function useCopilotIntegrationView(openIntegration: IIntegration | undefined, hasProvider: boolean) {
  useRegisterCopilotPageView(CopilotPageEnum.INTEGRATIONS, {
    viewing: openIntegration
      ? {
          resource: {
            type: CopilotViewingResourceEnum.INTEGRATION,
            id: openIntegration._id,
            label: openIntegration.name,
          },
        }
      : undefined,
    // Only once the sheet renders: it's null until the integration loads.
    overSheet: !!openIntegration && hasProvider,
  });
}

type UpdateIntegrationSidebarProps = {
  isOpened: boolean;
};

export function UpdateIntegrationSidebar({ isOpened }: UpdateIntegrationSidebarProps) {
  const has = useHasPermission();
  const navigate = useNavigate();
  const { integrationId } = useParams();
  const { integrations } = useFetchIntegrations();
  const integration = integrations?.find((i) => i._id === integrationId);
  const provider = novuProviders?.find((p) => p.id === integration?.providerId);

  const { deleteIntegration, isLoading: isDeleting } = useDeleteIntegration();
  const { mutateAsync: updateIntegration, isPending: isUpdating } = useUpdateIntegration();
  const { mutateAsync: setPrimaryIntegration, isPending: isSettingPrimary } = useSetPrimaryIntegration();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formState, setFormState] = useState({
    isValid: true,
    errors: {} as Record<string, unknown>,
    isDirty: false,
    changedFields: [] as string[],
  });
  const [isSheetOpen, setIsSheetOpen] = useState(isOpened);

  const {
    isPrimaryModalOpen,
    setIsPrimaryModalOpen,
    pendingData,
    setPendingData,
    handleSubmitWithPrimaryCheck,
    handlePrimaryConfirm,
    existingPrimaryIntegration,
    isChannelSupportPrimary,
    hasOtherProviders,
    hasSameChannelActiveIntegration,
  } = useIntegrationPrimaryModal({
    onSubmit,
    integrations,
    integration,
    mode: 'update',
    setPrimaryIntegration: setPrimaryIntegration,
  });
  const makePrimary = useMakePrimary(integration);

  const isReadOnly = !has({ permission: PermissionsEnum.INTEGRATION_WRITE });
  const queryClient = useQueryClient();
  const { environments, currentEnvironment } = useEnvironment();
  /**
   * Leaving with unsaved changes, waiting on "Discard changes": closing the drawer, another environment's
   * integration, a duplicate or the activity feed. `action` finishes the modal's "If you … now".
   */
  const [pendingNavigation, setPendingNavigation] = useState<{ run: () => void; action: string }>();
  const isHttpLogsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTTP_LOGS_PAGE_ENABLED, false);

  // The same integration in each environment: integrations aren't linked across environments, so they're
  // matched by identifier.
  const matches = useMemo(
    () =>
      integration
        ? // Environments may use different providers under one identifier; each row shows its own.
          (integrations ?? []).filter((item) => item.identifier === integration.identifier)
        : [],
    [integrations, integration]
  );
  const { verificationById, verify } = useIntegrationVerification(matches, environments);
  const environment = environments?.find((env) => env._id === integration?._environmentId);
  const { mutate: duplicate, isPending: isDuplicating } = useDuplicateIntegration({
    integration,
    provider,
    sourceEnvironment: environment,
  });

  useCopilotIntegrationView(isOpened ? integration : undefined, !!provider);

  async function onSubmit(data: IntegrationFormData, skipPrimaryCheck?: boolean) {
    if (!integration) return;

    /**
     * We don't want to check the integration if it's a demo integration
     * Since we don't have credentials for it
     */
    if (integration?.providerId === 'novu-email' || integration?.providerId === 'novu-sms') {
      data.check = false;
    }

    // If the integration was primary and is being unmarked or deactivated
    if (!skipPrimaryCheck && integration.primary && ((!data.primary && data.active) || !data.active)) {
      if (hasSameChannelActiveIntegration) {
        setIsPrimaryModalOpen(true);
        setPendingData(data);
        return;
      }
    }

    try {
      await updateIntegration({
        integrationId: integration._id,
        data: {
          name: data.name,
          identifier: data.identifier,
          active: data.active,
          primary: data.primary,
          credentials: cleanCredentials(data.credentials),
          check: data.check,
          configurations: data.configurations,
          rules: data.rules ?? null,
        },
      });

      if (data.primary && data.active && isChannelSupportPrimary && !data.rules) {
        await setPrimaryIntegration({ integrationId: integration._id });
      }

      showSuccessToast('Integration updated successfully');
      // The last check was about the old settings, so it no longer applies.
      queryClient.removeQueries({ queryKey: getIntegrationVerificationQueryKey(integration._id) });

      setIsSheetOpen(false);
      navigate(ROUTES.INTEGRATIONS);
    } catch (error: unknown) {
      handleIntegrationError(error, 'update');
    }
  }

  const onDelete = async (newPrimaryIntegrationId?: string) => {
    if (!integration) return;

    try {
      if (newPrimaryIntegrationId) {
        await setPrimaryIntegration({ integrationId: newPrimaryIntegrationId });
      }

      await deleteIntegration({ id: integration._id });

      showIntegrationDeletedToast({
        integration,
        newPrimary: integrations?.find((i) => i._id === newPrimaryIntegrationId),
      });
      setIsDeleteDialogOpen(false);
      setIsSheetOpen(false);
      navigate(ROUTES.INTEGRATIONS);
    } catch (error: unknown) {
      handleIntegrationError(error, 'delete');
    }
  };

  // Sync sheet open state with isOpened prop
  useEffect(() => {
    setIsSheetOpen(isOpened);
  }, [isOpened]);

  const closeDrawer = () => {
    setIsSheetOpen(false);
    navigate(ROUTES.INTEGRATIONS);
  };

  const handleClose = () => {
    if (formState.isDirty && !isUpdating && !isSettingPrimary && !isDeleting) {
      setPendingNavigation({ run: closeDrawer, action: 'close the drawer' });

      return;
    }

    closeDrawer();
  };

  const openIntegration = (integrationIdToOpen: string) =>
    navigate(buildRoute(ROUTES.INTEGRATIONS_UPDATE, { integrationId: integrationIdToOpen }), { replace: true });

  const isWriting = isUpdating || isSettingPrimary || isDeleting;
  // Read when a navigation runs, so one started after a request (a duplicate) sees edits made while it ran.
  const navigationGuard = useRef({ isWriting, isDirty: formState.isDirty });
  navigationGuard.current = { isWriting, isDirty: formState.isDirty };

  /** Leaves this integration, after confirming when it has unsaved changes. */
  const requestNavigation = (run: () => void, action: string) => {
    // A save that finishes after a switch would close the drawer on the next integration's edits.
    if (navigationGuard.current.isWriting) return;
    if (navigationGuard.current.isDirty) {
      setPendingNavigation({ run, action });

      return;
    }

    run();
  };

  const handleSelectEnvironment = (target: { _id: string; _environmentId: string }) => {
    if (target._id === integration?._id) return;
    const targetEnvironment = environments?.find((env) => env._id === target._environmentId);
    requestNavigation(
      () => openIntegration(target._id),
      targetEnvironment ? `switch to ${targetEnvironment.name}` : 'switch environments'
    );
  };

  const handleDiscardChanges = () => {
    pendingNavigation?.run();
    setPendingNavigation(undefined);
  };

  const copyIdentifier = async () => {
    if (!integration) return;
    try {
      await navigator.clipboard.writeText(integration.identifier);
      showSuccessToast('Identifier copied to clipboard.');
    } catch {
      showErrorToast("Couldn't copy the identifier.");
    }
  };

  const handleDuplicate = (target: IEnvironment) => {
    if (!integration) return;

    duplicate(target, {
      onSuccess: ({ integration: copy, needsSecrets }) => {
        if (!needsSecrets) {
          showSuccessToast(`${integration.name} is set up in ${target.name}.`);

          return;
        }

        showSuccessToast(
          `Its secrets weren't copied, so it's paused. Paste them in ${target.name} and resume it.`,
          `${integration.name} added to ${target.name}`
        );
        requestNavigation(() => openIntegration(copy._id), `open the copy in ${target.name}`);
      },
      onError: (error) =>
        showErrorToast(
          error instanceof Error ? error.message : 'Try again in a moment.',
          `Couldn't duplicate to ${target.name}`
        ),
    });
  };

  if (!integration || !provider) return null;

  const isIntegrationDeletionAllowed =
    !isDemoIntegration(integration?.providerId) && integration?.channel !== ChannelTypeEnum.IN_APP && !isReadOnly;

  const verification = verificationById.get(integration._id) ?? { tone: 'neutral' as const, label: '' };
  const formId = `integration-configuration-form-${provider.id}`;
  const onMakePrimary = canMakePrimary(integration, isReadOnly, isChannelSupportPrimary) ? makePrimary.open : undefined;

  const { duplicateTargets, duplicateNote } = getDuplicateMenu({
    integration,
    environment,
    environments: environments ?? [],
    matches,
    isReadOnly,
  });

  const activityEnvironmentSlug = environment?.slug;
  const viewActivity =
    has({ permission: PermissionsEnum.NOTIFICATION_READ }) && activityEnvironmentSlug
      ? () => {
          const path = buildRoute(isHttpLogsPageEnabled ? ROUTES.ACTIVITY_WORKFLOW_RUNS : ROUTES.ACTIVITY_FEED, {
            environmentSlug: activityEnvironmentSlug,
          });
          // The feed has no per-integration filter yet; its channel is the closest match.
          const query = integration.channel ? `?${new URLSearchParams({ channels: integration.channel })}` : '';
          requestNavigation(() => navigate(`${path}${query}`), 'open the activity feed');
        }
      : undefined;

  return (
    <>
      <IntegrationSheet
        isOpened={isSheetOpen}
        onClose={handleClose}
        provider={provider}
        mode="update"
        isManageLayout
        header={
          <ManageIntegrationHeader
            integration={integration}
            provider={provider}
            // Verifying needs write access, so read-only members don't get an action that can only fail.
            canVerify={!isReadOnly && integration.active && canVerifyIntegration(integration)}
            canDelete={isIntegrationDeletionAllowed}
            duplicateTargets={duplicateTargets}
            duplicateNote={duplicateNote}
            isDuplicating={isDuplicating}
            onVerify={() =>
              verify(integration).catch(() => showErrorToast(`Couldn't verify ${integration.name}. Try again.`))
            }
            onDuplicate={handleDuplicate}
            onCopyIdentifier={copyIdentifier}
            onMakePrimary={onMakePrimary}
            onViewActivity={viewActivity}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        }
      >
        <div className="flex min-h-0 flex-1">
          <IntegrationDetailsPanel
            integration={integration}
            provider={provider}
            environments={environments ?? []}
            currentEnvironmentId={currentEnvironment?._id}
            matches={matches}
            verificationById={verificationById}
            isSwitchDisabled={isWriting}
            onSelect={handleSelectEnvironment}
          />
          <div className="scrollbar-custom flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <EnvironmentTitle environment={environment} verification={verification} />
            <VerificationBanner verification={verification} />
            <IntegrationSettings
              // Switching environments shows another integration, so the form starts again from its values.
              key={integration._id}
              layout="manage"
              isChannelSupportPrimary={isChannelSupportPrimary}
              provider={provider}
              integration={integration}
              onSubmit={handleSubmitWithPrimaryCheck}
              // Taking primary from another integration confirms first; with none to take it from, Save applies it.
              onRequestPrimary={existingPrimaryIntegration ? onMakePrimary : undefined}
              mode="update"
              hasOtherProviders={!!hasOtherProviders}
              isReadOnly={isReadOnly}
              onFormStateChange={setFormState}
            />
            <ProviderGuideLink provider={provider} />
          </div>
        </div>

        <ManageIntegrationFooter
          verification={verification}
          formId={formId}
          isSaving={isUpdating || isSettingPrimary}
          canSave={formState.isValid}
          isReadOnly={isReadOnly}
          onCancel={handleClose}
        />
      </IntegrationSheet>

      <DeleteIntegrationModal
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={onDelete}
        integration={integration}
        channelIntegrations={integrations?.filter(
          (i) =>
            i._id !== integration?._id &&
            i.channel === integration?.channel &&
            i._environmentId === integration?._environmentId
        )}
        isLoading={isDeleting || isSettingPrimary}
      />

      <MakePrimaryModal
        isOpen={makePrimary.isOpen}
        newPrimaryName={integration.name}
        currentPrimaryName={existingPrimaryIntegration?.name}
        channel={integration.channel}
        environment={environment}
        environments={environments ?? []}
        removesConditions={hasRoutingConditions(integration)}
        isLoading={makePrimary.isPending}
        onCancel={makePrimary.close}
        onConfirm={makePrimary.confirm}
      />

      <PrimaryIntegrationModal
        integration={integration}
        integrations={integrations ?? []}
        environment={environment}
        environments={environments ?? []}
        isOpen={isPrimaryModalOpen}
        pendingName={pendingData?.name}
        currentPrimaryName={existingPrimaryIntegration?.name}
        isLoading={isUpdating || isSettingPrimary}
        onOpenChange={setIsPrimaryModalOpen}
        onConfirm={handlePrimaryConfirm}
      />

      <DiscardChangesModal
        isOpen={!!pendingNavigation}
        changedFields={formState.changedFields}
        environmentName={environment?.name}
        action={pendingNavigation?.action ?? 'close the drawer'}
        onKeepEditing={() => setPendingNavigation(undefined)}
        onDiscard={handleDiscardChanges}
      />
    </>
  );
}

/** "Duplicate to…": the environments to copy into, and what the copy leaves behind. */
function getDuplicateMenu({
  integration,
  environment,
  environments,
  matches,
  isReadOnly,
}: {
  integration: IIntegration;
  environment?: IEnvironment;
  environments: IEnvironment[];
  matches: IIntegration[];
  isReadOnly: boolean;
}) {
  // Inbox and Novu's demo providers are set up in every environment by Novu, so there's nothing to copy.
  const duplicateTargets =
    isReadOnly || isDemoIntegration(integration.providerId) || integration.channel === ChannelTypeEnum.IN_APP
      ? []
      : getDuplicateTargets(integration, environments, matches);
  const keepsSecretsBehind = duplicateTargets.some(
    (target) => !target.existing && !shouldCopySecrets(environment, target.environment)
  );
  const duplicateNote = keepsSecretsBehind
    ? `Copies settings and credentials. From ${environment?.name ?? 'a live environment'} into development environments, secrets are not copied. Paste them there.`
    : 'Copies settings and credentials.';

  return { duplicateTargets, duplicateNote };
}

/** Primary applies to active integrations on channels that have one, and needs write access. */
function canMakePrimary(integration: IIntegration, isReadOnly: boolean, isChannelSupportPrimary: boolean) {
  return !isReadOnly && isChannelSupportPrimary && integration.active && !integration.primary;
}

/** Saving a change to primary: confirm taking over from the current primary, or pick who takes over this one's. */
function PrimaryIntegrationModal({
  integration,
  integrations,
  environment,
  environments,
  isOpen,
  pendingName,
  currentPrimaryName,
  isLoading,
  onOpenChange,
  onConfirm,
}: {
  integration: IIntegration;
  integrations: IIntegration[];
  environment?: IEnvironment;
  environments: IEnvironment[];
  isOpen: boolean;
  /** The name in the form being saved; it may have been edited too. */
  pendingName?: string;
  currentPrimaryName?: string;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newPrimaryIntegrationId?: string) => void;
}) {
  if (integration.primary) {
    return (
      <SelectPrimaryIntegrationModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isLoading={isLoading}
        otherIntegrations={integrations.filter(
          (other) =>
            other._id !== integration._id &&
            other.channel === integration.channel &&
            other.active &&
            other._environmentId === integration._environmentId
        )}
        mode="select"
      />
    );
  }

  return (
    <MakePrimaryModal
      isOpen={isOpen}
      newPrimaryName={pendingName || integration.name}
      currentPrimaryName={currentPrimaryName}
      channel={integration.channel}
      environment={environment}
      environments={environments}
      isLoading={isLoading}
      onCancel={() => onOpenChange(false)}
      onConfirm={() => onConfirm()}
    />
  );
}
