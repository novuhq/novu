import { AgentRuntimeProviderIdEnum, type IIntegration, IntegrationKindEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine, RiArrowRightUpLine, RiCloseLine } from 'react-icons/ri';
import {
  type AgentResponse,
  getAgentDemoQuotaQueryKey,
  getAgentDetailQueryKey,
  getAgentIntegrationsQueryKey,
  migrateAgentRuntime,
} from '@/api/agents';
import {
  ConfigureCredentialsSection,
  type CreateAgentFormErrors,
  type VerifyStatus,
} from '@/components/agents/create-agent-fields';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useVerifyManagedCredentials } from '@/hooks/use-verify-managed-credentials';
import { AGENTS_DOCS_OVERVIEW_URL } from '@/utils/agent-docs';
import { QueryKeys } from '@/utils/query-keys';
import { isDemoIntegration } from '../integrations/components/utils/helpers';
import { getClaudeManagedAgentIntegrations } from './connectors/claude-managed-integrations';
import { getConnectorById } from './connectors/connector-options';
import { IntegrationDropdown, type IntegrationDropdownStatus } from './connectors/integration-dropdown';

type DemoClaudeUpgradePanelProps = {
  agent: AgentResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ANTHROPIC_CONNECTOR = getConnectorById('claude');
const DEFAULT_ANTHROPIC_INTEGRATION_NAME = 'Anthropic';

function dropdownStatusFor(verify: VerifyStatus, hasUsableSelectedIntegration: boolean): IntegrationDropdownStatus {
  if (hasUsableSelectedIntegration) return 'valid';
  if (verify === 'valid') return 'valid';
  if (verify === 'invalid') return 'missing';

  return 'idle';
}

export function DemoClaudeUpgradePanel({ agent, open, onOpenChange }: DemoClaudeUpgradePanelProps) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { integrations, isLoading: isLoadingIntegrations, isFetched: areIntegrationsFetched } = useFetchIntegrations();
  const { mutateAsync: createIntegration } = useCreateIntegration();
  const verifyMutation = useVerifyManagedCredentials();
  const verifiedCredentialsRef = useRef<string | null>(null);

  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(undefined);
  const [credentialsPanelVisible, setCredentialsPanelVisible] = useState(false);
  const [integrationName, setIntegrationName] = useState(DEFAULT_ANTHROPIC_INTEGRATION_NAME);
  const [apiKey, setApiKey] = useState('');
  const [externalWorkspaceId, setExternalWorkspaceId] = useState('');
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | undefined>();
  const [credentialsExpanded, setCredentialsExpanded] = useState(true);

  const realAnthropicIntegrations = useMemo(
    () =>
      getClaudeManagedAgentIntegrations(integrations, AgentRuntimeProviderIdEnum.Anthropic).filter(
        (integration) => !isDemoIntegration(integration.providerId)
      ),
    [integrations]
  );

  const selectedIntegration = useMemo(
    () => realAnthropicIntegrations.find((integration) => integration._id === selectedIntegrationId),
    [realAnthropicIntegrations, selectedIntegrationId]
  );

  const hasUsableSelectedIntegration = Boolean(selectedIntegration);

  const resetForm = () => {
    setSelectedIntegrationId(undefined);
    setCredentialsPanelVisible(false);
    setIntegrationName(DEFAULT_ANTHROPIC_INTEGRATION_NAME);
    setApiKey('');
    setExternalWorkspaceId('');
    setErrors({});
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    setCredentialsExpanded(true);
    verifiedCredentialsRef.current = null;
  };

  // When the dialog opens, pick the latest real Anthropic integration if one exists. Otherwise
  // fall back to the inline setup form so the user has somewhere to act immediately — there is
  // nothing to "pick" yet. Wait for the integrations query to resolve first; an empty list while
  // still loading must not be treated as "no credentials" or we'd skip auto-selecting an existing
  // integration once it arrives.
  useEffect(() => {
    if (!open) return;
    if (!areIntegrationsFetched) return;
    if (selectedIntegrationId) return;
    if (credentialsPanelVisible) return;

    // `realAnthropicIntegrations` is sorted newest-first by Mongo `_id`, so [0] is the latest.
    const latest = realAnthropicIntegrations[0];
    if (latest) {
      setSelectedIntegrationId(latest._id);

      return;
    }

    setCredentialsPanelVisible(true);
    setCredentialsExpanded(true);
  }, [open, areIntegrationsFetched, selectedIntegrationId, credentialsPanelVisible, realAnthropicIntegrations]);

  // Bump the default integration name when the integration list changes so a new credential gets
  // a unique "Anthropic N" name out of the box.
  useEffect(() => {
    if (!credentialsPanelVisible) return;
    if (integrationName && integrationName !== DEFAULT_ANTHROPIC_INTEGRATION_NAME) return;

    const nextIndex = realAnthropicIntegrations.length + 1;
    setIntegrationName(`${DEFAULT_ANTHROPIC_INTEGRATION_NAME} ${nextIndex}`);
  }, [credentialsPanelVisible, realAnthropicIntegrations, integrationName]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  };

  const verifyCredentials = async (trimmedApiKey: string, trimmedWorkspaceId: string): Promise<void> => {
    const verificationKey = `${trimmedApiKey}:${trimmedWorkspaceId}`;

    if (verifiedCredentialsRef.current === verificationKey) {
      return;
    }

    setVerifyStatus('verifying');
    setVerifyMessage(undefined);

    try {
      await verifyMutation.mutateAsync({
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        apiKey: trimmedApiKey,
        externalWorkspaceId: trimmedWorkspaceId || undefined,
      });
      setVerifyStatus('valid');
      setVerifyMessage(undefined);
      setErrors((prev) => ({ ...prev, apiKey: undefined }));
      verifiedCredentialsRef.current = verificationKey;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid';

      setVerifyStatus('invalid');
      setVerifyMessage(message);

      throw new Error(message);
    }
  };

  const handleVerify = () => {
    const trimmedApiKey = apiKey.trim();

    if (!trimmedApiKey || verifyMutation.isPending) {
      return;
    }

    void verifyCredentials(trimmedApiKey, externalWorkspaceId.trim());
  };

  const handleApiKeyChange = (next: string) => {
    setApiKey(next);
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    verifiedCredentialsRef.current = null;
    setErrors((prev) => ({ ...prev, apiKey: undefined }));
  };

  const handleSelectIntegration = (integration: IIntegration) => {
    setSelectedIntegrationId(integration._id);
    setCredentialsPanelVisible(false);
    setApiKey('');
    setExternalWorkspaceId('');
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    verifiedCredentialsRef.current = null;
    setErrors({});
  };

  const handleRequestSetupCredentials = () => {
    setSelectedIntegrationId(undefined);
    setCredentialsPanelVisible(true);
    setCredentialsExpanded(true);
    setIntegrationName(`${DEFAULT_ANTHROPIC_INTEGRATION_NAME} ${realAnthropicIntegrations.length + 1}`);
  };

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      // Path A — reuse an already-configured Anthropic integration.
      if (hasUsableSelectedIntegration && selectedIntegration) {
        return migrateAgentRuntime(environment, agent.identifier, { integrationId: selectedIntegration._id });
      }

      // Path B — create a new Anthropic integration from the inline credentials form.
      const trimmedApiKey = apiKey.trim();
      const trimmedName = integrationName.trim();
      const trimmedWorkspaceId = externalWorkspaceId.trim();
      const nextErrors: CreateAgentFormErrors = {};

      if (!trimmedName) {
        nextErrors.integrationName = 'Integration name is required';
      }

      if (!trimmedApiKey) {
        nextErrors.apiKey = 'Anthropic API key is required';
      }

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        throw new Error('Complete the required fields');
      }

      await verifyCredentials(trimmedApiKey, trimmedWorkspaceId);

      const integrationResult = await createIntegration({
        active: true,
        kind: IntegrationKindEnum.AGENT,
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        credentials: {
          apiKey: trimmedApiKey,
          ...(trimmedWorkspaceId ? { externalWorkspaceId: trimmedWorkspaceId } : {}),
        },
        name: trimmedName,
      });

      return migrateAgentRuntime(environment, agent.identifier, { integrationId: integrationResult.data._id });
    },
    onSuccess: () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      queryClient.invalidateQueries({ queryKey: getAgentDemoQuotaQueryKey(environment._id, agent.identifier) });
      queryClient.invalidateQueries({ queryKey: getAgentIntegrationsQueryKey(environment._id, agent.identifier) });
      queryClient.invalidateQueries({ queryKey: getAgentDetailQueryKey(environment._id, agent.identifier) });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, environment._id] });
      showSuccessToast('Agent migrated', 'New conversations will run on your Anthropic account.');
      handleOpenChange(false);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not migrate agent runtime.';

      showErrorToast(message, 'Migration failed');
    },
  });

  const isBusy = upgradeMutation.isPending || verifyMutation.isPending;
  const isSetupCredentialsReady =
    credentialsPanelVisible && integrationName.trim().length > 0 && apiKey.trim().length > 0;
  const canMigrate = !isBusy && (hasUsableSelectedIntegration || isSetupCredentialsReady);
  const dropdownStatus = dropdownStatusFor(verifyStatus, hasUsableSelectedIntegration);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft w-[600px] max-w-[600px] gap-0 overflow-hidden rounded-12 border p-0 shadow-xl sm:rounded-12"
        hideCloseButton
      >
        <div className="bg-bg-weak flex flex-col gap-3 p-4">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <DialogTitle className="text-text-strong text-[16px] font-medium leading-6 tracking-[-0.176px]">
                Migrate agent to your Anthropic account
              </DialogTitle>
              <DialogDescription className="text-text-soft text-label-xs leading-4">
                Novu will replace this agent and create a new agent in your account and route future messages to it.{' '}
                <a
                  href={AGENTS_DOCS_OVERVIEW_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-text-soft hover:text-text-sub inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                >
                  Learn more
                  <RiArrowRightUpLine className="size-3.5 shrink-0" aria-hidden />
                </a>
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <CompactButton size="md" variant="ghost" icon={RiCloseLine} disabled={isBusy}>
                <span className="sr-only">Close</span>
              </CompactButton>
            </DialogClose>
          </div>
        </div>

        <div className="border-stroke-soft border-y" />

        <div className="bg-background flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-4 min-h-[200px]">
          <div className="flex flex-col gap-2">
            <span className="text-text-strong text-label-xs font-medium">Anthropic integration</span>
            {isLoadingIntegrations ? <Skeleton className="h-8 w-full rounded-md" /> : null}

            {!isLoadingIntegrations && ANTHROPIC_CONNECTOR ? (
              <IntegrationDropdown
                connector={ANTHROPIC_CONNECTOR}
                selectedIntegrationId={selectedIntegrationId}
                integrations={integrations}
                status={dropdownStatus}
                showStatusBadge={hasUsableSelectedIntegration}
                disabled={isBusy}
                setupLabel="Setup Anthropic credentials"
                excludeDemo
                onSelectIntegration={handleSelectIntegration}
                onRequestSetupCredentials={handleRequestSetupCredentials}
              />
            ) : null}

            {credentialsPanelVisible ? (
              <ConfigureCredentialsSection
                providerId={AgentRuntimeProviderIdEnum.Anthropic}
                providerLabel="Anthropic"
                integrationName={integrationName}
                apiKey={apiKey}
                externalWorkspaceId={externalWorkspaceId}
                errors={errors}
                disabled={isBusy}
                status={verifyStatus}
                statusMessage={verifyMessage}
                expanded={credentialsExpanded}
                showSaveButton={false}
                onExpandedChange={setCredentialsExpanded}
                onIntegrationNameChange={(next) => {
                  setIntegrationName(next);
                  setErrors((prev) => ({ ...prev, integrationName: undefined }));
                }}
                onApiKeyChange={handleApiKeyChange}
                onExternalWorkspaceIdChange={(next) => {
                  setExternalWorkspaceId(next);
                  setVerifyStatus('idle');
                  setVerifyMessage(undefined);
                  verifiedCredentialsRef.current = null;
                }}
                onVerify={handleVerify}
                onSave={() => undefined}
              />
            ) : null}
          </div>
        </div>

        <div className="bg-bg-weak border-stroke-soft flex items-center gap-3 border-t px-4 py-3">
          <Button
            variant="secondary"
            mode="gradient"
            size="xs"
            className={isBusy ? 'shrink-0' : 'ml-auto'}
            disabled={!canMigrate}
            isLoading={isBusy}
            trailingIcon={RiArrowRightSLine}
            onClick={() => upgradeMutation.mutate()}
          >
            Setup agent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
