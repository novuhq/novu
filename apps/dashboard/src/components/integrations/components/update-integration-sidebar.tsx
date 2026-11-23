import {
  ChannelTypeEnum,
  FeatureFlagsKeysEnum,
  type IEnvironment,
  providers as novuProviders,
  PermissionsEnum,
} from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import {
  canVerifyIntegration,
  getIntegrationHealthQueryKey,
  useIntegrationHealth,
} from './hooks/use-integration-health';
import { useIntegrationPrimaryModal } from './hooks/use-integration-primary-modal';
import { showIntegrationDeletedToast } from './integration-deleted-toast';
import { IntegrationSettings } from './integration-settings';
import { IntegrationSheet } from './integration-sheet';
import {
  EnvironmentTitle,
  HealthBanner,
  IntegrationDetailsPanel,
  ManageIntegrationFooter,
  ManageIntegrationHeader,
  ProviderGuideLink,
} from './manage-integration-drawer';
import { DeleteIntegrationModal } from './modals/delete-integration-modal';
import { DiscardChangesModal } from './modals/discard-changes-modal';
import { SelectPrimaryIntegrationModal } from './modals/select-primary-integration-modal';
import { handleIntegrationError } from './utils/handle-integration-error';
import { cleanCredentials, isDemoIntegration } from './utils/helpers';

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
  const { healthById, verify } = useIntegrationHealth(matches, environments);
  const environment = environments?.find((env) => env._id === integration?._environmentId);
  const { mutate: duplicate, isPending: isDuplicating } = useDuplicateIntegration({
    integration,
    provider,
    sourceEnvironment: environment,
  });

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
      queryClient.removeQueries({ queryKey: getIntegrationHealthQueryKey(integration._id) });

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

  const health = healthById.get(integration._id) ?? { tone: 'neutral' as const, label: '', needsReconnect: false };
  const formId = `integration-configuration-form-${provider.id}`;

  // Inbox and Novu's demo providers are set up in every environment by Novu, so there's nothing to copy.
  const duplicateTargets =
    isReadOnly || isDemoIntegration(integration.providerId) || integration.channel === ChannelTypeEnum.IN_APP
      ? []
      : getDuplicateTargets(integration, environments ?? [], matches);
  const keepsSecretsBehind = duplicateTargets.some(
    (target) => !target.existing && !shouldCopySecrets(environment, target.environment)
  );
  const duplicateNote = keepsSecretsBehind
    ? `Copies settings and credentials. From ${environment?.name ?? 'a live environment'} into development environments, secrets are not copied. Paste them there.`
    : 'Copies settings and credentials.';

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
            healthById={healthById}
            isSwitchDisabled={isWriting}
            onSelect={handleSelectEnvironment}
          />
          <div className="scrollbar-custom flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <EnvironmentTitle environment={environment} health={health} />
            <HealthBanner integration={integration} environment={environment} health={health} />
            <IntegrationSettings
              // Switching environments shows another integration, so the form starts again from its values.
              key={integration._id}
              layout="manage"
              isChannelSupportPrimary={isChannelSupportPrimary}
              provider={provider}
              integration={integration}
              onSubmit={handleSubmitWithPrimaryCheck}
              mode="update"
              hasOtherProviders={!!hasOtherProviders}
              isReadOnly={isReadOnly}
              onFormStateChange={setFormState}
            />
            <ProviderGuideLink provider={provider} />
          </div>
        </div>

        <ManageIntegrationFooter
          integration={integration}
          environment={environment}
          health={health}
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

      <SelectPrimaryIntegrationModal
        isOpen={isPrimaryModalOpen}
        onOpenChange={setIsPrimaryModalOpen}
        onConfirm={handlePrimaryConfirm}
        currentPrimaryName={existingPrimaryIntegration?.name}
        newPrimaryName={pendingData?.name ?? ''}
        isLoading={isUpdating || isSettingPrimary}
        otherIntegrations={integrations?.filter(
          (i) =>
            i._id !== integration?._id &&
            i.channel === integration?.channel &&
            i.active &&
            i._environmentId === integration?._environmentId
        )}
        mode={integration?.primary ? 'select' : 'switch'}
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
