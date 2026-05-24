import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  getAgentDemoQuotaQueryKey,
  migrateAgentRuntime,
  verifyManagedCredentials,
  type AgentResponse,
} from '@/api/agents';
import { ClaudeCredentialsFields } from '@/components/agents/create-agent-fields/claude-credentials-fields';
import { Button } from '@/components/primitives/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/primitives/sheet';
import { showErrorToast, showSuccessToast } from '@/components/primitives/toast';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useCreateIntegration } from '@/hooks/use-create-integration';

type DemoClaudeUpgradePanelProps = {
  agent: AgentResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DemoClaudeUpgradePanel({ agent, open, onOpenChange }: DemoClaudeUpgradePanelProps) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { mutateAsync: createIntegration } = useCreateIntegration();
  const [apiKey, setApiKey] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [errors, setErrors] = useState<{ apiKey?: string }>({});
  const [step, setStep] = useState<'credentials' | 'migrating'>('credentials');

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      if (!apiKey.trim()) {
        setErrors({ apiKey: 'API key is required' });
        throw new Error('API key is required');
      }

      setStep('migrating');

      await verifyManagedCredentials(environment, {
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        apiKey: apiKey.trim(),
        externalWorkspaceId: workspaceId.trim() || undefined,
      });

      const integrationResult = await createIntegration({
        active: true,
        kind: IntegrationKindEnum.AGENT,
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        credentials: {
          apiKey: apiKey.trim(),
          ...(workspaceId.trim() ? { externalWorkspaceId: workspaceId.trim() } : {}),
        },
        name: `${agent.name} Anthropic`,
      });

      return migrateAgentRuntime(environment, agent.identifier, { integrationId: integrationResult.data._id });
    },
    onSuccess: () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      queryClient.invalidateQueries({ queryKey: getAgentDemoQuotaQueryKey(environment._id, agent.identifier) });
      showSuccessToast('Agent migrated', 'New conversations will run on your Anthropic account.');
      onOpenChange(false);
      setApiKey('');
      setWorkspaceId('');
      setStep('credentials');
    },
    onError: (error: unknown) => {
      setStep('credentials');
      const message = error instanceof Error ? error.message : 'Could not migrate agent runtime.';

      showErrorToast(message, 'Migration failed');
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Use your own Anthropic key</SheetTitle>
          <SheetDescription>
            Connect your Anthropic account to remove demo limits. Existing demo conversations stay read-only; new
            traffic runs on your credentials.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          <ClaudeCredentialsFields
            apiKey={apiKey}
            workspaceId={workspaceId}
            errors={errors}
            disabled={upgradeMutation.isPending}
            onApiKeyChange={(next) => {
              setApiKey(next);
              if (errors.apiKey) setErrors({});
            }}
            onWorkspaceIdChange={setWorkspaceId}
          />
          <Button
            onClick={() => upgradeMutation.mutate()}
            disabled={upgradeMutation.isPending}
            isLoading={upgradeMutation.isPending}
          >
            {step === 'migrating' ? 'Migrating agent…' : 'Connect and migrate'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
