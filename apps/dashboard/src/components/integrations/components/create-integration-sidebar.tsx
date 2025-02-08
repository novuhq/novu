import { useNavigate, useParams } from 'react-router-dom';
import { providers as novuProviders } from '@novu/shared';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useIntegrationList } from './hooks/use-integration-list';
import { useSidebarNavigationManager } from './hooks/use-sidebar-navigation-manager';
import { IntegrationSheet } from './integration-sheet';
import { ChannelTabs } from './channel-tabs';
import { IntegrationConfiguration } from './integration-configuration';
import { handleIntegrationError } from './utils/handle-integration-error';
import { useSetPrimaryIntegration } from '../../../hooks/use-set-primary-integration';
import { SelectPrimaryIntegrationModal } from './modals/select-primary-integration-modal';
import { IntegrationFormData } from '../types';
import { useIntegrationPrimaryModal } from './hooks/use-integration-primary-modal';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildRoute, ROUTES } from '../../../utils/routes';
import { showSuccessToast } from '../../../components/primitives/sonner-helpers';
import { Button } from '../../primitives/button';

export type CreateIntegrationSidebarProps = {
  isOpened: boolean;
};

export function CreateIntegrationSidebar({ isOpened }: CreateIntegrationSidebarProps) {
  const navigate = useNavigate();
  const { providerId } = useParams();

  const providers = novuProviders;
  const { mutateAsync: createIntegration, isPending } = useCreateIntegration();
  const { mutateAsync: setPrimaryIntegration, isPending: isSettingPrimary } = useSetPrimaryIntegration();
  const { integrations } = useFetchIntegrations();

  const handleIntegrationSelect = (integrationId: string) => {
    navigate(buildRoute(ROUTES.INTEGRATIONS_CONNECT_PROVIDER, { providerId: integrationId }), { replace: true });
  };

  const handleBack = () => {
    navigate(ROUTES.INTEGRATIONS_CONNECT, { replace: true });
  };

  const { selectedIntegration, step, searchQuery, onIntegrationSelect, onBack } = useSidebarNavigationManager({
    isOpened,
    initialProviderId: providerId,
    onIntegrationSelect: handleIntegrationSelect,
    onBack: handleBack,
  });

  const { integrationsByChannel } = useIntegrationList(searchQuery);
  const provider = providers?.find((p) => p.id === (selectedIntegration || providerId));
  const {
    isPrimaryModalOpen,
    setIsPrimaryModalOpen,
    pendingData,
    handleSubmitWithPrimaryCheck,
    handlePrimaryConfirm,
    existingPrimaryIntegration,
    isChannelSupportPrimary,
  } = useIntegrationPrimaryModal({
    onSubmit: handleCreateIntegration,
    integrations,
    channel: provider?.channel,
    mode: 'create',
  });

  async function handleCreateIntegration(data: IntegrationFormData) {
    if (!provider) return;

    try {
      const integration = await createIntegration({
        providerId: provider.id,
        channel: provider.channel,
        credentials: data.credentials,
        name: data.name,
        identifier: data.identifier,
        active: data.active,
        _environmentId: data.environmentId,
      });

      if (data.primary && isChannelSupportPrimary && data.active) {
        await setPrimaryIntegration({ integrationId: integration.data._id });
      }

      showSuccessToast('Integration created successfully');

      navigate(ROUTES.INTEGRATIONS);
    } catch (error: unknown) {
      handleIntegrationError(error, 'create');
    }
  }

  const handleClose = () => {
    navigate(ROUTES.INTEGRATIONS);
  };

  return (
    <>
      <IntegrationSheet
        isOpened={isOpened}
        onClose={handleClose}
        provider={provider}
        mode="create"
        step={step}
        onBack={onBack}
      >
        {step === 'select' ? (
          <div className="scrollbar-custom flex-1 overflow-y-auto">
            <ChannelTabs
              integrationsByChannel={integrationsByChannel}
              searchQuery={searchQuery}
              onIntegrationSelect={onIntegrationSelect}
            />
          </div>
        ) : provider ? (
          <>
            <div className="scrollbar-custom flex-1 overflow-y-auto">
              <IntegrationConfiguration
                isChannelSupportPrimary={isChannelSupportPrimary}
                provider={provider}
                onSubmit={handleSubmitWithPrimaryCheck}
                mode="create"
              />
            </div>
            <div className="bg-background flex justify-end gap-2 border-t p-3">
              <Button
                type="submit"
                variant="secondary"
                form="integration-configuration-form"
                isLoading={isPending || isSettingPrimary}
                size="xs"
              >
                Create Integration
              </Button>
            </div>
          </>
        ) : null}
      </IntegrationSheet>

      <SelectPrimaryIntegrationModal
        isOpen={isPrimaryModalOpen}
        onOpenChange={setIsPrimaryModalOpen}
        onConfirm={handlePrimaryConfirm}
        currentPrimaryName={existingPrimaryIntegration?.name}
        newPrimaryName={pendingData?.name ?? ''}
        isLoading={isPending || isSettingPrimary}
      />
    </>
  );
}
