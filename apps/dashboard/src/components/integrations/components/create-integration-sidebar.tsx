import { ChatProviderIdEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { slackQuickSetup, updateIntegration } from '@/api/integrations';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { showErrorToast, showSuccessToast } from '../../../components/primitives/sonner-helpers';
import { useSetPrimaryIntegration } from '../../../hooks/use-set-primary-integration';
import { QueryKeys } from '../../../utils/query-keys';
import { buildRoute, ROUTES } from '../../../utils/routes';
import { Button } from '../../primitives/button';
import { UnsavedChangesAlertDialog } from '../../unsaved-changes-alert-dialog';
import { IntegrationFormData } from '../types';
import { AddProviderPicker } from './add-provider-picker';
import { useIntegrationList } from './hooks/use-integration-list';
import { useIntegrationPrimaryModal } from './hooks/use-integration-primary-modal';
import { useSidebarNavigationManager } from './hooks/use-sidebar-navigation-manager';
import { IntegrationSettings } from './integration-settings';
import { IntegrationSheet } from './integration-sheet';
import { SelectPrimaryIntegrationModal } from './modals/select-primary-integration-modal';
import { ProviderSetupFooter } from './provider-setup-layout';
import { handleIntegrationError } from './utils/handle-integration-error';
import { cleanCredentials, usesProviderSetupLayout } from './utils/helpers';

export type CreateIntegrationSidebarProps = {
  isOpened: boolean;
};

export function CreateIntegrationSidebar({ isOpened }: CreateIntegrationSidebarProps) {
  const navigate = useNavigate();
  const { providerId } = useParams();
  const [searchParams] = useSearchParams();

  const { mutateAsync: createIntegration, isPending } = useCreateIntegration();
  const { mutateAsync: setPrimaryIntegration, isPending: isSettingPrimary } = useSetPrimaryIntegration();
  const [formState, setFormState] = useState({ isValid: true, errors: {} as Record<string, unknown>, isDirty: false });
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(isOpened);

  const handleIntegrationSelect = (integrationId: string) => {
    navigate(buildRoute(ROUTES.INTEGRATIONS_CONNECT_PROVIDER, { providerId: integrationId }), { replace: true });
  };

  const handleBack = () => {
    navigate(ROUTES.INTEGRATIONS_CONNECT, { replace: true });
  };

  const { selectedIntegration, step, searchQuery, setSearchQuery, onIntegrationSelect, onBack } =
    useSidebarNavigationManager({
      isOpened,
      initialProviderId: providerId,
      onIntegrationSelect: handleIntegrationSelect,
      onBack: handleBack,
    });

  const { catalogProviders } = useIntegrationList();
  const provider = catalogProviders.find((providerItem) => providerItem.id === (selectedIntegration || providerId));

  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { environments } = useEnvironment();
  const usesSetupLayout = step === 'configure' && usesProviderSetupLayout(provider?.id);

  /**
   * The integration "Create app" made, with the environment it lives in. "Connect provider" then saves the
   * rest of the form onto it, and a retry after a failed Slack call reuses it.
   */
  const [quickSetupResult, setQuickSetupResult] = useState<{
    integrationId: string;
    environmentId: string;
    appId?: string;
  }>();
  /** Bumped on every reset, so a reply from an abandoned setup can tell it is stale and do nothing. */
  const setupAttemptRef = useRef(0);

  // A new provider, or going back to the list, starts a fresh setup.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the provider or step changes.
  useEffect(() => {
    setupAttemptRef.current += 1;
    setQuickSetupResult(undefined);
  }, [provider?.id, step]);

  const refreshIntegrations = () => {
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
  };

  const { mutate: createSlackApp, isPending: isCreatingSlackApp } = useMutation({
    mutationFn: async ({
      data,
      configToken,
      appName,
    }: {
      data: IntegrationFormData;
      configToken: string;
      appName: string;
    }) => {
      const attempt = setupAttemptRef.current;
      const isCurrent = () => attempt === setupAttemptRef.current;
      // Once the integration exists, it stays in its environment, whatever the pills say.
      const environmentId = quickSetupResult?.environmentId ?? data.environmentId;
      const environment = environments?.find((env) => env._id === environmentId);
      if (!provider || !environment) throw new Error('Pick an environment first.');

      // Reuse the integration from an earlier attempt, so a retry doesn't create a second one.
      let integrationId = quickSetupResult?.integrationId;
      if (!integrationId) {
        const created = await createIntegration({
          providerId: provider.id,
          channel: provider.channel,
          credentials: {},
          configurations: data.configurations,
          name: data.name,
          identifier: data.identifier,
          active: data.active,
          _environmentId: environment._id,
          rules: data.rules ?? null,
        });
        integrationId = created.data._id;
        if (isCurrent()) setQuickSetupResult({ integrationId, environmentId: environment._id });
      }

      const { appId } = await slackQuickSetup(integrationId, { configToken, appName }, environment);

      return { attempt, result: { integrationId, environmentId: environment._id, appId } };
    },
    onSuccess: ({ attempt, result }) => {
      refreshIntegrations();
      // The user moved on to another provider meanwhile: the Slack integration stays, but this sheet isn't its.
      if (attempt !== setupAttemptRef.current) return;
      setQuickSetupResult(result);
      showSuccessToast('Slack app created. Its credentials are saved.');
    },
    onError: (error: unknown) =>
      showErrorToast(error instanceof Error ? error.message : "Couldn't create the Slack app. Try again."),
  });

  /** Saves the general settings, and any credentials typed in Manual, onto the integration "Create app" made. */
  const { mutate: finishQuickSetup, isPending: isFinishingQuickSetup } = useMutation({
    mutationFn: async ({ integrationId, data }: { integrationId: string; data: IntegrationFormData }) => {
      const environment = environments?.find((env) => env._id === quickSetupResult?.environmentId);
      if (!environment) throw new Error('The integration has no environment.');

      const credentials = cleanCredentials(data.credentials);

      return updateIntegration(
        integrationId,
        {
          name: data.name,
          identifier: data.identifier,
          active: data.active,
          configurations: data.configurations,
          rules: data.rules ?? null,
          ...(Object.keys(credentials ?? {}).length > 0 && { credentials, check: false }),
        },
        environment
      );
    },
    onSuccess: () => {
      refreshIntegrations();
      showSuccessToast(`${provider?.displayName ?? 'Integration'} connected`);
      setIsSheetOpen(false);
      navigate(ROUTES.INTEGRATIONS);
    },
    onError: (error: unknown) => handleIntegrationError(error, 'update'),
  });

  useEffect(() => {
    if (isOpened && step === 'select') {
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpened, step]);

  // While the user is on the Telegram configure step, the sidebar shows a QR
  // mobile-setup card. If the visitor completes setup on their phone, the
  // public consume endpoint creates a new Telegram integration server-side.
  // We detect that creation by snapshotting the set of existing Telegram
  // integration ids on first paint and watching for a new one to appear.
  const isTelegramCreateStep = provider?.id === ChatProviderIdEnum.Telegram && step === 'configure';
  const initialTelegramIdsRef = useRef<Set<string> | null>(null);
  const hasHandledAutoConnectRef = useRef<boolean>(false);

  // Reset the snapshot whenever the user leaves the Telegram configure step so
  // re-entering the flow takes a fresh baseline (instead of treating already
  // existing integrations as freshly created).
  useEffect(() => {
    if (!isTelegramCreateStep) {
      initialTelegramIdsRef.current = null;
      hasHandledAutoConnectRef.current = false;
    }
  }, [isTelegramCreateStep]);

  const { integrations } = useFetchIntegrations({
    refetchInterval: isTelegramCreateStep ? 3000 : undefined,
  });

  useEffect(() => {
    if (!isTelegramCreateStep || !integrations) return;

    if (initialTelegramIdsRef.current === null) {
      initialTelegramIdsRef.current = new Set(
        integrations
          .filter((integration) => integration.providerId === ChatProviderIdEnum.Telegram)
          .map((integration) => integration._id)
      );

      return;
    }

    if (hasHandledAutoConnectRef.current) return;

    const newOne = integrations.find(
      (integration) =>
        integration.providerId === ChatProviderIdEnum.Telegram && !initialTelegramIdsRef.current?.has(integration._id)
    );

    if (newOne) {
      // Latch immediately so a refetch firing before unmount can't replay the
      // toast + navigate for the same newly-detected integration.
      hasHandledAutoConnectRef.current = true;
      showSuccessToast('Telegram bot connected from your phone');
      // Direct close (skip `useUnsavedChangesAlertDialog`) — the user explicitly
      // opted into the mobile flow, so confirming "discard changes" is noisy.
      setIsSheetOpen(false);
      navigate(buildRoute(ROUTES.INTEGRATIONS_UPDATE, { integrationId: newOne._id }));
    }
  }, [isTelegramCreateStep, integrations, navigate]);
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

    if (quickSetupResult) {
      if (!isFinishingQuickSetup) finishQuickSetup({ integrationId: quickSetupResult.integrationId, data });

      return;
    }

    try {
      const integration = await createIntegration({
        providerId: provider.id,
        channel: provider.channel,
        credentials: cleanCredentials(data.credentials),
        configurations: data.configurations,
        name: data.name,
        identifier: data.identifier,
        active: data.active,
        _environmentId: data.environmentId,
        rules: data.rules ?? null,
      });

      if (data.primary && isChannelSupportPrimary && data.active && !data.rules) {
        await setPrimaryIntegration({ integrationId: integration.data._id });
      }

      showSuccessToast('Integration created successfully');

      setIsSheetOpen(false);
      navigate(ROUTES.INTEGRATIONS);
    } catch (error: unknown) {
      handleIntegrationError(error, 'create');
    }
  }

  // Sync sheet open state with isOpened prop
  useEffect(() => {
    setIsSheetOpen(isOpened);
  }, [isOpened]);

  const handleClose = () => {
    // Only check for unsaved changes if we're on the configure step (form is visible)
    if (step === 'configure' && formState.isDirty && !isPending && !isSettingPrimary) {
      setShowUnsavedDialog(true);

      return;
    }

    setIsSheetOpen(false);
    navigate(ROUTES.INTEGRATIONS);
  };

  const handleProceedClose = () => {
    setShowUnsavedDialog(false);
    setIsSheetOpen(false);
    navigate(ROUTES.INTEGRATIONS);
  };

  const handleCancelClose = () => {
    setShowUnsavedDialog(false);
  };

  return (
    <>
      <IntegrationSheet
        isOpened={isSheetOpen}
        onClose={handleClose}
        provider={provider}
        mode="create"
        step={step}
        onBack={onBack}
      >
        {step === 'select' ? (
          <AddProviderPicker
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchInputRef={searchInputRef}
            onProviderSelect={onIntegrationSelect}
            defaultChannel={searchParams.get('channel')}
          />
        ) : provider ? (
          <>
            <div className="scrollbar-custom flex-1 overflow-y-auto">
              <IntegrationSettings
                isChannelSupportPrimary={isChannelSupportPrimary}
                provider={provider}
                onSubmit={handleSubmitWithPrimaryCheck}
                mode="create"
                onFormStateChange={setFormState}
                slackQuickSetup={
                  usesSetupLayout
                    ? {
                        appId: quickSetupResult?.appId,
                        isCreating: isCreatingSlackApp,
                        // The integration belongs to an environment from the moment creation starts.
                        isEnvironmentLocked: isCreatingSlackApp || !!quickSetupResult,
                        onCreateApp: (data, configToken, appName) => createSlackApp({ data, configToken, appName }),
                      }
                    : undefined
                }
              />
            </div>
            {usesSetupLayout ? (
              <ProviderSetupFooter
                onPickDifferentProvider={onBack}
                onCancel={handleClose}
                formId={`integration-configuration-form-${provider.id}`}
                isSubmitting={isPending || isSettingPrimary || isFinishingQuickSetup}
                canSubmit={formState.isValid && !isCreatingSlackApp && !isFinishingQuickSetup}
              />
            ) : (
              <div className="bg-background flex justify-end gap-2 border-t p-3">
                <Button
                  type="submit"
                  variant="secondary"
                  form={`integration-configuration-form-${provider.id}`}
                  isLoading={isPending || isSettingPrimary}
                  size="xs"
                  disabled={!formState.isValid}
                >
                  Create Integration
                </Button>
              </div>
            )}
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

      <UnsavedChangesAlertDialog show={showUnsavedDialog} onCancel={handleCancelClose} onProceed={handleProceedClose} />
    </>
  );
}
