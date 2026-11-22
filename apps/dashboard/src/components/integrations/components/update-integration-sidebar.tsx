import { ChannelTypeEnum, providers as novuProviders, PermissionsEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useSetPrimaryIntegration } from '@/hooks/use-set-primary-integration';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { buildRoute } from '@/utils/routes';
import { showErrorToast, showSuccessToast } from '../../../components/primitives/sonner-helpers';
import { useDeleteIntegration } from '../../../hooks/use-delete-integration';
import { ROUTES } from '../../../utils/routes';
import { UnsavedChangesAlertDialog } from '../../unsaved-changes-alert-dialog';
import { IntegrationFormData } from '../types';
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
  const [formState, setFormState] = useState({ isValid: true, errors: {} as Record<string, unknown>, isDirty: false });
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
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
  /** Another environment's integration picked from the details panel while this one has unsaved changes. */
  const [pendingSwitchId, setPendingSwitchId] = useState<string>();

  // The same integration in each environment: integrations aren't linked across environments, so they're
  // matched by identifier.
  const matches = useMemo(
    () =>
      integration
        ? (integrations ?? []).filter(
            (item) => item.identifier === integration.identifier && item.providerId === integration.providerId
          )
        : [],
    [integrations, integration]
  );
  const healthById = useIntegrationHealth(matches, environments);

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
      // New credentials need a fresh check the next time the drawer opens.
      queryClient.invalidateQueries({ queryKey: getIntegrationHealthQueryKey(integration._id) });

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

  const handleClose = () => {
    if (formState.isDirty && !isUpdating && !isSettingPrimary && !isDeleting) {
      setShowUnsavedDialog(true);

      return;
    }

    setIsSheetOpen(false);
    navigate(ROUTES.INTEGRATIONS);
  };

  const openIntegration = (integrationIdToOpen: string) =>
    navigate(buildRoute(ROUTES.INTEGRATIONS_UPDATE, { integrationId: integrationIdToOpen }), { replace: true });

  const handleSelectEnvironment = (target: { _id: string }) => {
    if (target._id === integration?._id) return;
    if (formState.isDirty) {
      setPendingSwitchId(target._id);
      setShowUnsavedDialog(true);

      return;
    }

    openIntegration(target._id);
  };

  const handleProceedClose = () => {
    setShowUnsavedDialog(false);
    if (pendingSwitchId) {
      openIntegration(pendingSwitchId);
      setPendingSwitchId(undefined);

      return;
    }

    setIsSheetOpen(false);
    navigate(ROUTES.INTEGRATIONS);
  };

  const handleCancelClose = () => {
    setShowUnsavedDialog(false);
    setPendingSwitchId(undefined);
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

  if (!integration || !provider) return null;

  const isIntegrationDeletionAllowed =
    !isDemoIntegration(integration?.providerId) && integration?.channel !== ChannelTypeEnum.IN_APP && !isReadOnly;

  const environment = environments?.find((env) => env._id === integration._environmentId);
  const health = healthById.get(integration._id) ?? { tone: 'neutral' as const, label: '', needsReconnect: false };
  const formId = `integration-configuration-form-${provider.id}`;

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
            canVerify={integration.active && canVerifyIntegration(integration)}
            canDelete={isIntegrationDeletionAllowed}
            onVerify={() => queryClient.invalidateQueries({ queryKey: getIntegrationHealthQueryKey(integration._id) })}
            onCopyIdentifier={copyIdentifier}
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

      <UnsavedChangesAlertDialog show={showUnsavedDialog} onCancel={handleCancelClose} onProceed={handleProceedClose} />
    </>
  );
}
