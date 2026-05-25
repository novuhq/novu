import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { RiArrowRightSLine, RiCloseLine } from 'react-icons/ri';
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
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useVerifyManagedCredentials } from '@/hooks/use-verify-managed-credentials';
import { QueryKeys } from '@/utils/query-keys';

type DemoClaudeUpgradePanelProps = {
  agent: AgentResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_ANTHROPIC_INTEGRATION_NAME = 'Anthropic';

export function DemoClaudeUpgradePanel({ agent, open, onOpenChange }: DemoClaudeUpgradePanelProps) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { mutateAsync: createIntegration } = useCreateIntegration();
  const verifyMutation = useVerifyManagedCredentials();
  const verifiedCredentialsRef = useRef<string | null>(null);

  const [integrationName, setIntegrationName] = useState(DEFAULT_ANTHROPIC_INTEGRATION_NAME);
  const [apiKey, setApiKey] = useState('');
  const [externalWorkspaceId, setExternalWorkspaceId] = useState('');
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | undefined>();
  const [credentialsExpanded, setCredentialsExpanded] = useState(true);

  const resetForm = () => {
    setIntegrationName(DEFAULT_ANTHROPIC_INTEGRATION_NAME);
    setApiKey('');
    setExternalWorkspaceId('');
    setErrors({});
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    setCredentialsExpanded(true);
    verifiedCredentialsRef.current = null;
  };

  useEffect(() => {
    if (open) {
      setIntegrationName(DEFAULT_ANTHROPIC_INTEGRATION_NAME);
    }
  }, [open]);

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

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
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
  const canMigrate = integrationName.trim().length > 0 && apiKey.trim().length > 0 && !isBusy;

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
                Use your own Anthropic key
              </DialogTitle>
              <DialogDescription className="text-text-soft text-label-xs leading-4">
                Connect your Anthropic account to remove demo limits. Existing demo conversations stay read-only; new
                traffic runs on your credentials.
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

        <div className="bg-background flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <span className="text-text-strong text-label-xs font-medium">Anthropic credentials</span>
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
          </div>
        </div>

        <div className="bg-bg-weak border-stroke-soft flex items-center justify-end border-t px-4 py-3">
          <Button
            variant="secondary"
            mode="gradient"
            size="xs"
            disabled={!canMigrate}
            isLoading={isBusy}
            trailingIcon={RiArrowRightSLine}
            onClick={() => upgradeMutation.mutate()}
          >
            Connect and migrate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
