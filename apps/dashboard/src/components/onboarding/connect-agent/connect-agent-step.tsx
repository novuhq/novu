import { type IIntegration, IntegrationKindEnum, slugify } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import type { AgentResponse, GeneratedManagedAgent } from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import {
  getClaudeManagedAgentIntegrations,
  isDemoManagedClaudeIntegrationSelected,
} from '@/components/agents/connectors/claude-managed-integrations';
import { type ConnectorIntegrationStatus } from '@/components/agents/connectors/connector-integration-dropdown';
import { type ConnectorOption } from '@/components/agents/connectors/connector-options';
import {
  AGENT_TEMPLATES,
  type AgentTemplate,
  buildManagedIntegrationCredentials,
  buildVerifyCredentialsPayload,
  buildVerifyFingerprint,
  type CreateAgentForm,
  type CreateAgentFormErrors,
  hasCompleteManagedCredentials,
  hasFormErrors,
  type ManagedAgentRuntimeOverrides,
  type RuntimeType,
  type VerifyStatus,
  validateCreateAgentForm,
  validateManagedCredentialFields,
} from '@/components/agents/create-agent-fields';
import { AGENT_TEMPLATES as DEFAULT_AGENT_TEMPLATES } from '@/components/connect/dashboard/agent-templates';
import { ClaudeIcon } from '@/components/icons/claude';
import { Button } from '@/components/primitives/button';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateAgentMutation } from '@/hooks/use-create-agent-mutation';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useManagedClaudeCredentialsFlow } from '@/hooks/use-managed-claude-credentials-flow';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { GenerationCancelledError, useGenerateManagedAgent } from '@/hooks/use-generate-managed-agent';
import { useTelemetry } from '@/hooks/use-telemetry';
import { useVerifyManagedCredentials } from '@/hooks/use-verify-managed-credentials';
import { QueryKeys } from '@/utils/query-keys';
import { TelemetryEvent } from '@/utils/telemetry';
import type { AgentGenerationMode } from './connect-agent-form';
import { ConnectAgentForm } from './connect-agent-form';
import { type ConnectSummary } from './connect-summary';
import { CONNECTOR_OPTIONS, type ConnectorId, getConnectorById } from './connector-options';
import type { GenerationStep } from './generation-status';
import type { TemplateSelection } from './template-dropdown';

const GENERATION_STEPS: ReadonlyArray<GenerationStep> = [
  { id: 'spinning', text: 'Spinning up a fresh agent' },
  { id: 'coffee', text: 'Sipping a little bit of coffee' },
  { id: 'system-prompt', text: 'Crafting the system prompt' },
  { id: 'tools', text: 'Picking the right tools' },
  { id: 'mcp', text: 'Wiring up MCP servers' },
  { id: 'skills', text: 'Selecting starter skills' },
  { id: 'agent', text: 'Generating your agent' },
];

export type { ConnectSummary } from './connect-summary';

const DEFAULT_CONNECTOR: ConnectorId = 'claude';

function resolveRuntime(connectorId: ConnectorId): RuntimeType {
  const runtime = getConnectorById(connectorId)?.runtime;

  return runtime ?? 'scratch';
}

function pickInitialConnector(isManagedEnabled: boolean): ConnectorId {
  if (isManagedEnabled) return DEFAULT_CONNECTOR;

  const fallback = CONNECTOR_OPTIONS.find((o) => !o.comingSoon && o.runtime === 'scratch');

  return (fallback?.id ?? 'custom-scaffold') as ConnectorId;
}

function dropdownStatusFor(verify: VerifyStatus, hasIntegration: boolean): ConnectorIntegrationStatus {
  if (hasIntegration || verify === 'valid') return 'valid';
  if (verify === 'invalid') return 'missing';

  return 'idle';
}

type ConnectAgentStepProps = {
  onAgentCreated: (agent: AgentResponse, summary: ConnectSummary) => void;
  onRuntimeChange?: (runtime: RuntimeType) => void;
  isManagedEnabled: boolean;
};

const DEFAULT_TEMPLATE = DEFAULT_AGENT_TEMPLATES[0];

const MIN_PROMPT_LENGTH = 8;

export function ConnectAgentStep({ onAgentCreated, onRuntimeChange, isManagedEnabled }: ConnectAgentStepProps) {
  const telemetry = useTelemetry();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const { submit, isPending } = useCreateAgentMutation();
  const { integrations } = useFetchIntegrations();
  const verifyMutation = useVerifyManagedCredentials();
  const { mutateAsync: createIntegration, isPending: isSavingIntegration } = useCreateIntegration();

  const [connectorId, setConnectorId] = useState<ConnectorId>(() => pickInitialConnector(isManagedEnabled));
  const [templateSelection, setTemplateSelection] = useState<TemplateSelection>(() => ({
    kind: 'template',
    template: DEFAULT_TEMPLATE,
  }));

  const [generationMode, setGenerationMode] = useState<AgentGenerationMode>('prompt');
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState<string | undefined>(undefined);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Tracks the whole prompt-mode submit lifecycle (LLM generate + create-agent mutation +
  // the brief gap before the parent swaps to the next phase). Without this, the status
  // animation flickers off in between `isGenerating` and `isPending` and reveals the
  // submit button momentarily.
  const [isPromptSubmitInFlight, setIsPromptSubmitInFlight] = useState(false);

  const {
    generate: generateManagedAgent,
    isPending: isGenerating,
    cancel: cancelGeneration,
  } = useGenerateManagedAgent();

  const [name, setName] = useState(() => (isManagedEnabled ? '' : DEFAULT_TEMPLATE.name));
  const [identifier, setIdentifier] = useState(() => (isManagedEnabled ? '' : slugify(DEFAULT_TEMPLATE.name)));
  const [instructions, setInstructions] = useState(() => (isManagedEnabled ? '' : DEFAULT_TEMPLATE.instructions));
  const {
    apiKey,
    externalWorkspaceId,
    region,
    verifyStatus,
    verifyMessage,
    lastVerifiedKeyRef,
    setApiKey,
    setExternalWorkspaceId,
    setRegion,
    setVerifyStatus,
    setVerifyMessage,
    resetCredentials,
  } = useManagedClaudeCredentialsFlow();
  const [externalAgentId, setExternalAgentId] = useState('');
  const [externalEnvironmentId, setExternalEnvironmentId] = useState('');
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});

  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(undefined);
  const [credentialsPanelVisible, setCredentialsPanelVisible] = useState(false);
  const [credentialsPanelExpanded, setCredentialsPanelExpanded] = useState(true);
  const [integrationName, setIntegrationName] = useState('');
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const savedBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the integration id from "Save integration" until it appears in the fetched list, so the
  // auto-select effect does not overwrite it or reopen the credentials section during refetch.
  const pinnedIntegrationIdRef = useRef<string | null>(null);

  const runtime = useMemo(() => resolveRuntime(connectorId), [connectorId]);
  const isClaudeSelected = runtime === 'claude';
  const isScratchRuntime = runtime === 'scratch';
  // The AI "Generate from prompt" surface is available for both managed Claude (when the
  // managed-runtime flag is on) and for the self-hosted Custom Scaffold flow unconditionally.
  // Custom Scaffold generation only produces name/identifier/systemPrompt — it does not touch
  // any Anthropic-managed infrastructure — so it has no reason to depend on that flag.
  const useAiGeneration = isClaudeSelected ? isManagedEnabled : isScratchRuntime;
  const isDemoProviderSelected = isDemoManagedClaudeIntegrationSelected(integrations, selectedIntegrationId);
  const isExistingMode =
    isClaudeSelected &&
    !isDemoProviderSelected &&
    (useAiGeneration ? generationMode === 'existing' : templateSelection.kind === 'existing');
  const isScratchMode =
    (useAiGeneration && generationMode === 'manual') || (!useAiGeneration && templateSelection.kind === 'scratch');
  const showExistingOption = isClaudeSelected && !isDemoProviderSelected;
  const existingOptionIcon = isClaudeSelected ? (
    <div className="bg-primary-base/10 text-primary-base flex size-4 items-center justify-center rounded-full">
      <ClaudeIcon className="size-3" />
    </div>
  ) : undefined;

  const selectedConnector = getConnectorById(connectorId);

  const matchingAnthropicIntegrations = useMemo(() => {
    if (!selectedConnector?.providerId) return [];

    return getClaudeManagedAgentIntegrations(integrations, selectedConnector?.providerId);
  }, [integrations, selectedConnector?.providerId]);

  useEffect(() => {
    onRuntimeChange?.(runtime);
  }, [runtime, onRuntimeChange]);

  // When the connector changes away from a managed runtime, the "Use an existing agent" mode is
  // no longer reachable — collapse back to scratch so the form fields stay consistent.
  useEffect(() => {
    if (!showExistingOption && templateSelection.kind === 'existing') {
      setTemplateSelection({ kind: 'scratch' });
    }
  }, [showExistingOption, templateSelection.kind]);

  // Same idea for the AI flow: when the connector no longer supports linking an existing agent,
  // collapse `'existing'` back to `'prompt'`. Otherwise the right-column form has no matching
  // branch (existing-fields are gated on Claude, and the scope tabs that would let the user pick
  // a new mode are hidden), so section 2 would render empty with no way to recover.
  useEffect(() => {
    if (!showExistingOption && generationMode === 'existing') {
      setGenerationMode('prompt');
      setExternalAgentId('');
      setExternalEnvironmentId('');
    }
  }, [showExistingOption, generationMode]);

  // Auto-select the first existing integration of the chosen provider on mount / when the connector
  // changes / when integrations finish loading. If none exist, open the inline credentials section.
  // We intentionally wait for `integrations` to be defined — on the onboarding entry-point the list
  // hasn't been fetched yet, so treating `undefined` as "no integrations" would prematurely open the
  // credentials panel and then block the auto-select once data arrives.
  useEffect(() => {
    if (isPending) return;
    if (integrations === undefined) return;

    const pinnedId = pinnedIntegrationIdRef.current;
    if (pinnedId) {
      const pinnedExists = matchingAnthropicIntegrations.some((i) => i._id === pinnedId);
      if (pinnedExists) {
        pinnedIntegrationIdRef.current = null;
      } else if (selectedIntegrationId !== pinnedId) {
        setSelectedIntegrationId(pinnedId);
      }

      return;
    }

    if (credentialsPanelVisible && !selectedIntegrationId) return;
    if (!selectedConnector?.providerId) {
      setSelectedIntegrationId(undefined);

      return;
    }

    if (selectedIntegrationId) {
      const stillExists = matchingAnthropicIntegrations.some((i) => i._id === selectedIntegrationId);
      if (stillExists) return;
    }

    if (matchingAnthropicIntegrations.length > 0) {
      setSelectedIntegrationId(matchingAnthropicIntegrations[0]._id);
      setCredentialsPanelVisible(false);
    } else {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(true);
    }
  }, [
    isPending,
    integrations,
    selectedConnector?.providerId,
    matchingAnthropicIntegrations,
    selectedIntegrationId,
    credentialsPanelVisible,
  ]);

  // Default integration name = "<Provider> <next-index>"
  useEffect(() => {
    if (!credentialsPanelVisible || !selectedConnector?.providerLabel) return;
    if (integrationName.trim()) return;

    const nextIndex = matchingAnthropicIntegrations.length + 1;
    setIntegrationName(`${selectedConnector.providerLabel} ${nextIndex}`);
  }, [
    credentialsPanelVisible,
    selectedConnector?.providerLabel,
    matchingAnthropicIntegrations.length,
    integrationName,
  ]);

  useEffect(() => {
    return () => {
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
    };
  }, []);

  const handleConnectorChange = useCallback((id: ConnectorId) => {
    setConnectorId(id);

    const next = getConnectorById(id);
    if (!next?.providerId) {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(false);
      resetCredentials();
    }
  }, [resetCredentials]);

  const handlePromptChange = useCallback((next: string) => {
    setPrompt(next);
    setPromptError(undefined);
  }, []);

  const handleSelectSuggestion = useCallback(
    (suggestion: AgentTemplate) => {
      setGenerationMode('prompt');
      setPrompt(suggestion.instructions);
      setPromptError(undefined);
      requestAnimationFrame(() => {
        const el = promptTextareaRef.current;
        if (!el) return;
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
      });

      telemetry(TelemetryEvent.ONBOARDING_AGENT_SUGGESTION_SELECTED, {
        suggestionId: suggestion.label,
        suggestionName: suggestion.name,
      });
    },
    [telemetry]
  );

  const handleGenerationModeChange = useCallback((next: AgentGenerationMode) => {
    setGenerationMode(next);
    if (next === 'prompt') {
      setExternalAgentId('');
      setExternalEnvironmentId('');
    } else if (next === 'manual') {
      setExternalAgentId('');
      setExternalEnvironmentId('');
      setPromptError(undefined);
    }
  }, []);

  const handleCancelGeneration = useCallback(() => {
    cancelGeneration();
  }, [cancelGeneration]);

  const handleTemplateChange = (next: TemplateSelection) => {
    setTemplateSelection(next);

    if (next.kind === 'template') {
      setName(next.template.name);
      if (!isIdentifierTouched) {
        setIdentifier(slugify(next.template.name));
        setErrors((prev) => ({ ...prev, identifier: undefined }));
      }
      setInstructions(next.template.instructions);
      setErrors((prev) => ({ ...prev, name: undefined }));
      setExternalAgentId('');
      setExternalEnvironmentId('');
    } else if (next.kind === 'scratch') {
      setName('');
      setIdentifier('');
      setInstructions('');
      setExternalAgentId('');
      setExternalEnvironmentId('');
    } else if (next.kind === 'existing') {
      setName('');
      setIdentifier('');
      setInstructions('');
      setExternalAgentId('');
      setExternalEnvironmentId('');
    }
  };

  const handleSelectIntegration = useCallback(
    (integration: IIntegration) => {
      setSelectedIntegrationId(integration._id);
      setCredentialsPanelVisible(false);
      resetCredentials();
      setErrors((prev) => ({ ...prev, apiKey: undefined, integrationName: undefined }));
    },
    [resetCredentials]
  );

  const handleRequestSetupCredentials = useCallback(
    (option: ConnectorOption) => {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(true);
      setVerifyStatus('idle');
      setVerifyMessage(undefined);
      lastVerifiedKeyRef.current = null;

      if (option.providerLabel && !integrationName.trim()) {
        const nextIndex = getClaudeManagedAgentIntegrations(integrations, option.providerId).length + 1;
        setIntegrationName(`${option.providerLabel} ${nextIndex}`);
      }
    },
    [integrations, integrationName]
  );

  const handleApiKeyChange = useCallback(
    (next: string) => {
      setApiKey(next);
      setErrors((prev) => ({ ...prev, apiKey: undefined }));
    },
    [setApiKey]
  );

  const handleExternalWorkspaceIdChange = useCallback(
    (next: string) => {
      setExternalWorkspaceId(next);
      setErrors((prev) => ({ ...prev, externalWorkspaceId: undefined }));
    },
    [setExternalWorkspaceId]
  );

  const handleRegionChange = useCallback(
    (next: string) => {
      setRegion(next);
      setErrors((prev) => ({ ...prev, region: undefined }));
    },
    [setRegion]
  );

  const handleVerify = useCallback(() => {
      if (!selectedConnector?.providerId) return;
      if (verifyMutation.isPending) return;

      const fields = { apiKey, region, externalWorkspaceId };
      const verifyKey = buildVerifyFingerprint(selectedConnector.providerId, fields);

      if (lastVerifiedKeyRef.current === verifyKey && verifyStatus === 'valid') return;

      lastVerifiedKeyRef.current = verifyKey;
      setVerifyStatus('verifying');
      setVerifyMessage(undefined);

      verifyMutation.mutate(buildVerifyCredentialsPayload(selectedConnector.providerId, fields), {
          onSuccess: () => {
            if (lastVerifiedKeyRef.current !== verifyKey) return;
            setVerifyStatus('valid');
            setVerifyMessage(undefined);
            setErrors((prev) => ({ ...prev, apiKey: undefined }));
          },
          onError: (err) => {
            if (lastVerifiedKeyRef.current !== verifyKey) return;
            setVerifyStatus('invalid');
            setVerifyMessage(err instanceof Error ? err.message : 'Invalid');
          },
        }
      );
    },
    [selectedConnector?.providerId, apiKey, externalWorkspaceId, region, verifyMutation, verifyStatus]
  );

  const handleSaveIntegration = useCallback(async () => {
    if (!selectedConnector?.providerId) return;

    const trimmedName = integrationName.trim();
    const fields = { apiKey, region, externalWorkspaceId };

    if (!trimmedName || !hasCompleteManagedCredentials(selectedConnector.providerId, fields)) return;

    try {
      const { data: integration } = await createIntegration({
        active: true,
        kind: IntegrationKindEnum.AGENT,
        providerId: selectedConnector.providerId,
        credentials: buildManagedIntegrationCredentials(selectedConnector.providerId, fields),
        name: trimmedName,
      });

      const environmentId = currentEnvironment?._id;
      if (environmentId) {
        queryClient.setQueryData<IIntegration[]>([QueryKeys.fetchIntegrations, environmentId], (existing) => {
          const list = existing ?? [];
          if (list.some((item) => item._id === integration._id)) return list;

          return [...list, integration];
        });
      }

      pinnedIntegrationIdRef.current = integration._id;
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(false);
      setSelectedIntegrationId(integration._id);
      resetCredentials();
      setShowSavedBadge(true);
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
      savedBadgeTimerRef.current = setTimeout(() => setShowSavedBadge(false), 2500);
      showSuccessToast(`${trimmedName} is ready to use.`, 'Integration saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save integration.';
      showErrorToast(message, 'Save failed');
    }
  }, [
    selectedConnector?.providerId,
    apiKey,
    integrationName,
    externalWorkspaceId,
    region,
    createIntegration,
    currentEnvironment?._id,
    queryClient,
    resetCredentials,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const isPromptGenerationMode = useAiGeneration && generationMode === 'prompt';

    let generated: GeneratedManagedAgent | null = null;
    let effectiveName = name;
    let effectiveIdentifier = identifier;
    let effectiveInstructions = instructions;
    let managedOverrides: ManagedAgentRuntimeOverrides | undefined;

    if (isPromptGenerationMode) {
      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt.length < MIN_PROMPT_LENGTH) {
        setPromptError(`Add at least ${MIN_PROMPT_LENGTH} characters describing your agent.`);

        return;
      }

      if (isClaudeSelected && !selectedIntegrationId && selectedConnector?.providerId) {
        const credentialErrors = validateManagedCredentialFields({
          providerId: selectedConnector.providerId,
          apiKey,
          region,
          externalWorkspaceId,
        });

        if (credentialErrors.apiKey || credentialErrors.region || credentialErrors.externalWorkspaceId) {
          setErrors((prev) => ({ ...prev, ...credentialErrors }));

          return;
        }
      }

      setIsPromptSubmitInFlight(true);

      try {
        generated = await generateManagedAgent({
          prompt: trimmedPrompt,
          runtime: isClaudeSelected ? 'managed' : 'self-hosted',
        });
      } catch (err) {
        setIsPromptSubmitInFlight(false);

        if (err instanceof GenerationCancelledError) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Could not generate agent.';
        showErrorToast(message, 'Generation failed');

        return;
      }

      effectiveName = generated.name;
      effectiveIdentifier = generated.identifier;
      effectiveInstructions = generated.systemPrompt;
      managedOverrides = {
        systemPrompt: generated.systemPrompt,
        tools: generated.tools,
        mcpServers: generated.mcpServers,
        skills: generated.skills,
      };

      telemetry(TelemetryEvent.ONBOARDING_AGENT_PROMPT_GENERATED, {
        promptLength: trimmedPrompt.length,
        toolsCount: generated.tools.length,
        mcpsCount: generated.mcpServers.length,
        skillsCount: generated.skills.length,
        tools: generated.tools,
        mcpServers: generated.mcpServers,
        skills: generated.skills.map((s) => s.skillId),
      });
    }

    const form: CreateAgentForm = {
      name: effectiveName,
      identifier: effectiveIdentifier,
      instructions: effectiveInstructions,
      apiKey,
      runtime,
      isExistingMode,
      providerId: selectedConnector?.providerId,
      externalAgentId,
      externalEnvironmentId,
      externalWorkspaceId,
      region,
      integrationId: selectedIntegrationId,
      integrationName,
    };

    const nextErrors = validateCreateAgentForm(form);

    if (hasFormErrors(nextErrors)) {
      setErrors(nextErrors);
      setIsPromptSubmitInFlight(false);

      return;
    }

    setErrors({});

    telemetry(TelemetryEvent.ONBOARDING_CONNECT_AGENT_SUBMITTED, {
      runtime,
      connectorId,
      mode: useAiGeneration ? generationMode : 'template',
      templateKind: templateSelection.kind,
      templateLabel: templateSelection.kind === 'template' ? templateSelection.template.label : undefined,
      isExistingMode,
      promptLength: isPromptGenerationMode ? prompt.trim().length : undefined,
    });

    const summary: ConnectSummary = {
      connectorId,
      templateSelection,
      name: effectiveName,
      identifier: effectiveIdentifier,
      instructions: effectiveInstructions,
      apiKey,
      externalAgentId,
      externalEnvironmentId,
      externalWorkspaceId,
      region: region.trim() || undefined,
      selectedIntegrationId,
      integrationName,
    };

    await submit(
      {
        name: effectiveName.trim(),
        identifier: effectiveIdentifier.trim(),
        instructions: effectiveInstructions.trim(),
        apiKey: apiKey.trim(),
        runtime,
        isExistingMode,
        providerId: selectedConnector?.providerId,
        externalAgentId: externalAgentId.trim(),
        externalEnvironmentId: externalEnvironmentId.trim(),
        externalWorkspaceId: externalWorkspaceId.trim() || undefined,
        region: region.trim() || undefined,
        integrationId: selectedIntegrationId,
        integrationName: integrationName.trim() || undefined,
        managedOverrides,
      },
      {
        onSuccess: (agent) => onAgentCreated(agent, summary),
        onError: (err) => {
          setIsPromptSubmitInFlight(false);
          const message = err instanceof NovuApiError ? err.message : 'Could not create agent.';
          showErrorToast(message, 'Create failed');
        },
      }
    );
  };

  const dropdownStatus = dropdownStatusFor(verifyStatus, Boolean(selectedIntegrationId));
  const isSubmitBusy = isPending || isGenerating || isPromptSubmitInFlight;

  const submitButton = (
    <Button
      type="submit"
      variant="secondary"
      mode="gradient"
      size="xs"
      className="mt-1 w-fit gap-1"
      isLoading={isSubmitBusy}
      trailingIcon={RiArrowRightSLine}
    >
      Setup agent
    </Button>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6">
      <div
        className="absolute bottom-0 left-[22px] top-0 w-px"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
        }}
      />

      <ConnectAgentForm
        connectorId={connectorId}
        isClaudeSelected={isClaudeSelected}
        apiKey={apiKey}
        externalWorkspaceId={externalWorkspaceId}
        region={region}
        templateSelection={templateSelection}
        isExistingMode={isExistingMode}
        isScratchMode={isScratchMode}
        showExistingOption={showExistingOption}
        existingOptionIcon={existingOptionIcon}
        name={name}
        identifier={identifier}
        instructions={instructions}
        isIdentifierTouched={isIdentifierTouched}
        externalAgentId={externalAgentId}
        externalEnvironmentId={externalEnvironmentId}
        errors={errors}
        disabled={isSubmitBusy}
        aiGeneration={
          useAiGeneration
            ? {
                mode: generationMode,
                onModeChange: handleGenerationModeChange,
                prompt,
                onPromptChange: handlePromptChange,
                promptError,
                suggestions: AGENT_TEMPLATES,
                onSelectSuggestion: handleSelectSuggestion,
                textareaRef: promptTextareaRef,
                isGenerating: isSubmitBusy,
                generationSteps: GENERATION_STEPS,
                onCancelGeneration: handleCancelGeneration,
                // Cancel is only meaningful while the LLM call is in flight; once it returns
                // we are mid-provisioning at Anthropic and there is nothing to abort, so keep
                // the button visible (avoids a layout shift) but disable it.
                isCancelDisabled: !isGenerating,
                isScratchRuntime,
              }
            : undefined
        }
        integrations={integrations}
        selectedIntegrationId={selectedIntegrationId}
        dropdownStatus={dropdownStatus}
        showSavedBadge={showSavedBadge}
        credentialsPanelVisible={credentialsPanelVisible}
        credentialsPanelExpanded={credentialsPanelExpanded}
        integrationName={integrationName}
        verifyStatus={verifyStatus}
        verifyMessage={verifyMessage}
        isSavingIntegration={isSavingIntegration}
        onConnectorChange={handleConnectorChange}
        onTemplateChange={handleTemplateChange}
        onApiKeyChange={handleApiKeyChange}
        onExternalWorkspaceIdChange={handleExternalWorkspaceIdChange}
        onRegionChange={handleRegionChange}
        onNameChange={(next) => {
          setName(next);
          setErrors((prev) => ({ ...prev, name: undefined }));
        }}
        onIdentifierChange={(next) => {
          setIdentifier(next);
          setErrors((prev) => ({ ...prev, identifier: undefined }));
        }}
        onIdentifierTouched={() => setIsIdentifierTouched(true)}
        onInstructionsChange={setInstructions}
        onExternalAgentIdChange={(next) => {
          setExternalAgentId(next);
          setErrors((prev) => ({ ...prev, externalAgentId: undefined }));
        }}
        onExternalEnvironmentIdChange={(next) => {
          setExternalEnvironmentId(next);
          setErrors((prev) => ({ ...prev, externalEnvironmentId: undefined }));
        }}
        onSelectIntegration={handleSelectIntegration}
        onRequestSetupCredentials={handleRequestSetupCredentials}
        onCredentialsExpandedChange={setCredentialsPanelExpanded}
        onIntegrationNameChange={(next) => {
          setIntegrationName(next);
          setErrors((prev) => ({ ...prev, integrationName: undefined }));
        }}
        onVerify={handleVerify}
        onSaveIntegration={handleSaveIntegration}
        submitSlot={useAiGeneration ? submitButton : undefined}
      />

      {!useAiGeneration && <div className="flex flex-col gap-2 pl-6">{submitButton}</div>}
    </form>
  );
}
