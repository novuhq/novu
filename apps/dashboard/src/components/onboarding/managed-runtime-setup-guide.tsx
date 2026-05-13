import { AGENT_RUNTIME_PROVIDERS, FeatureFlagsKeysEnum, IntegrationKindEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLoader4Line,
  RiRobot2Line,
  RiServerLine,
} from 'react-icons/ri';
import type { CreateAgentBody } from '@/api/agents';
import { createAgent } from '@/api/agents';
import { createIntegration } from '@/api/integrations';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input';
import { Label } from '../primitives/label';
import { Textarea } from '../primitives/textarea';

type RuntimeChoice = 'self-hosted' | 'managed';

type ManagedRuntimeSetupGuideProps = {
  /** Called when bridge connection setup should proceed (self-hosted path). */
  onSelfHostedSelected: () => void;
  /** Called when a managed agent has been provisioned successfully. */
  onManagedAgentCreated: () => void;
};

type StepId = 'choose' | 'managed-config';

const anthropicProvider = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === 'anthropic');

export function ManagedRuntimeSetupGuide({
  onSelfHostedSelected,
  onManagedAgentCreated,
}: ManagedRuntimeSetupGuideProps) {
  const isManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);
  const [step, setStep] = useState<StepId>('choose');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('claude-opus-4-5');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful support assistant. Answer customer questions clearly and concisely, and escalate when needed.'
  );
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const { currentEnvironment } = useEnvironment();
  const track = useTelemetry();

  const createManagedAgent = useMutation({
    mutationFn: async () => {
      const env = requireEnvironment(currentEnvironment, 'No environment selected');

      // Step 1: Create an Anthropic integration holding the encrypted API key
      const integrationResponse = await createIntegration(
        {
          providerId: 'anthropic',
          kind: IntegrationKindEnum.AGENT,
          credentials: { apiKey },
          configurations: {},
          name: 'Anthropic (managed agents)',
          active: true,
          _environmentId: env._id,
        },
        env
      );
      const integrationId = integrationResponse.data._id;

      // Step 2: Create the managed agent referencing the integration
      const body: CreateAgentBody = {
        name: 'Support agent',
        identifier: 'support-agent',
        description: 'Handles customer questions across your connected channels.',
        runtime: 'managed',
        managedRuntime: {
          providerId: 'anthropic',
          integrationId,
          model: model || undefined,
          systemPrompt: systemPrompt || undefined,
        },
      };

      return createAgent(env, body);
    },
    onSuccess: () => {
      track(TelemetryEvent.AGENT_CREATED_FROM_DASHBOARD, {
        source: 'onboarding',
        runtime: 'managed',
        providerId: 'anthropic',
      });
      onManagedAgentCreated();
    },
    onError: (error: unknown) => {
      const err = error as Record<string, unknown>;

      if (err?.code === 'AGENT_RUNTIME_UNAUTHORIZED' || (typeof err?.status === 'number' && err.status === 401)) {
        setApiKeyError('The API key is invalid or revoked. Please check and try again.');
      } else {
        setApiKeyError(typeof err?.message === 'string' ? err.message : 'Failed to create agent. Please try again.');
      }
    },
  });

  useEffect(() => {
    if (!isManagedEnabled) {
      onSelfHostedSelected();
    }
  }, [isManagedEnabled, onSelfHostedSelected]);

  if (!isManagedEnabled) {
    return null;
  }

  if (step === 'choose') {
    return (
      <RuntimeChooser
        onSelect={(choice) => {
          if (choice === 'self-hosted') {
            onSelfHostedSelected();
          } else {
            setStep('managed-config');
          }
        }}
      />
    );
  }

  const isSubmitDisabled = !apiKey.trim() || createManagedAgent.isPending;

  return (
    <div className="mt-4 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          <RiRobot2Line className="text-feature-500 size-4" />
          <span className="text-text-strong text-sm font-semibold">Connect Claude (Anthropic)</span>
        </div>
        <p className="text-text-soft mt-1 text-xs">
          Enter your Anthropic API key. Novu will provision and manage the agent on your behalf.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* API key */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="anthropic-api-key" className="text-xs">
            Anthropic API key <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="anthropic-api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setApiKeyError(null);
              }}
              className="pr-8 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="text-text-soft hover:text-text-sub absolute right-2 top-1/2 -translate-y-1/2"
            >
              {showKey ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
            </button>
          </div>
          {apiKeyError && <p className="text-destructive text-xs">{apiKeyError}</p>}
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-model" className="text-xs">
            Model
          </Label>
          <Input
            id="agent-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="claude-opus-4-5"
            className="font-mono text-xs"
          />
        </div>

        {/* System prompt */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="system-prompt" className="text-xs">
            System prompt
          </Label>
          <Textarea
            id="system-prompt"
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful support assistant…"
            className="resize-none text-xs"
          />
          <p className="text-text-soft text-[11px]">
            Guides how Claude behaves. You can edit this later in the agent overview.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="secondary"
          mode="ghost"
          size="sm"
          onClick={() => setStep('choose')}
          disabled={createManagedAgent.isPending}
        >
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={isSubmitDisabled}
          onClick={() => createManagedAgent.mutate()}
          className="ml-auto gap-1"
        >
          {createManagedAgent.isPending ? (
            <>
              <RiLoader4Line className="size-3.5 animate-spin" />
              Creating agent…
            </>
          ) : (
            <>
              Connect & continue
              <RiArrowRightSLine className="size-4" />
            </>
          )}
        </Button>
      </div>

      {createManagedAgent.isSuccess && (
        <div className="border-success-200 bg-success-50 flex items-center gap-2 rounded-md border px-3 py-2">
          <RiCheckLine className="text-success-600 size-4 shrink-0" />
          <span className="text-success-700 text-xs font-medium">Agent created successfully!</span>
        </div>
      )}

      <ProviderCapabilities providerId="anthropic" />
    </div>
  );
}

function RuntimeChooser({ onSelect }: { onSelect: (choice: RuntimeChoice) => void }) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-text-strong text-sm font-semibold">How do you want to set up your agent brain?</p>
      <p className="text-text-soft text-xs">
        Choose managed to let Novu provision and manage the agent on Claude Platform, or self-hosted to point Novu at
        your own bridge server.
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onSelect('managed')}
          className="border-stroke-soft hover:border-feature-400 hover:bg-feature-50 group flex items-start gap-3 rounded-lg border bg-white p-3 text-left transition-colors"
        >
          <div className="bg-feature-100 group-hover:bg-feature-200 mt-0.5 flex size-8 items-center justify-center rounded-md transition-colors">
            <RiRobot2Line className="text-feature-600 size-4" />
          </div>
          <div>
            <p className="text-text-strong text-label-sm font-semibold">
              Managed by {anthropicProvider?.displayName ?? 'Claude'}
            </p>
            <p className="text-text-soft text-label-xs mt-0.5">
              Novu stores your API key and provisions the agent on Claude Platform. No code to maintain.
            </p>
          </div>
          <RiArrowRightSLine className="text-text-soft mt-1 ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>

        <button
          type="button"
          onClick={() => onSelect('self-hosted')}
          className="border-stroke-soft hover:border-stroke-strong group flex items-start gap-3 rounded-lg border bg-white p-3 text-left transition-colors"
        >
          <div className="bg-bg-weak group-hover:bg-neutral-200 mt-0.5 flex size-8 items-center justify-center rounded-md transition-colors">
            <RiServerLine className="text-text-sub size-4" />
          </div>
          <div>
            <p className="text-text-strong text-label-sm font-semibold">Self-hosted bridge</p>
            <p className="text-text-soft text-label-xs mt-0.5">
              Point Novu at a bridge server you control. Full flexibility, requires code.
            </p>
          </div>
          <RiArrowRightSLine className="text-text-soft mt-1 ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>
    </div>
  );
}

function ProviderCapabilities({ providerId }: { providerId: string }) {
  const provider = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === providerId);

  if (!provider) {
    return null;
  }

  const capabilities = Object.entries(provider.capabilities)
    .filter(([, supported]) => supported)
    .map(([cap]) => {
      const labels: Record<string, string> = {
        mcpServers: 'MCP servers',
        tools: 'Tools',
        model: 'Model selection',
        systemPrompt: 'System prompt',
      };

      return labels[cap] ?? cap;
    });

  return (
    <div className="border-stroke-soft rounded-lg border p-3">
      <p className="text-text-sub text-label-xs font-medium">Included with {provider.displayName}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {capabilities.map((cap) => (
          <span
            key={cap}
            className="bg-bg-weak border-stroke-soft text-text-sub inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]"
          >
            <RiCheckLine className="text-success-600 size-3" />
            {cap}
          </span>
        ))}
      </div>
      {provider.docsUrl && (
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-feature-600 hover:text-feature-700 mt-2 inline-flex items-center gap-1 text-[11px]"
        >
          View docs
          <RiArrowRightSLine className="size-3" />
        </a>
      )}
    </div>
  );
}
