import {
  filterDemoConfigurableMcpIds,
  type IIntegration,
  IntegrationKindEnum,
  isProviderManagedMcp,
  slugify,
} from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import type { AgentResponse, GeneratedManagedAgent } from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { AgentPreviewSkeleton } from '@/components/agents/agent-preview-skeleton';
import {
  getClaudeManagedAgentIntegrations,
  isDemoManagedClaudeIntegrationSelected,
  partitionClaudeManagedIntegrations,
} from '@/components/agents/connectors/claude-managed-integrations';
import { type ConnectorIntegrationStatus } from '@/components/agents/connectors/connector-integration-dropdown';
import { type ConnectorOption } from '@/components/agents/connectors/connector-options';
import {
  type AgentTemplate,
  buildManagedIntegrationCredentials,
  buildVerifyCredentialsPayload,
  buildVerifyFingerprint,
  type CreateAgentForm,
  type CreateAgentFormErrors,
  findAgentTemplateById,
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
import { useAgentSuggestions } from '@/hooks/use-agent-suggestions';
import { useAgentTemplates } from '@/hooks/use-agent-templates';
import { useCreateAgentMutation } from '@/hooks/use-create-agent-mutation';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { GenerationCancelledError, useGenerateManagedAgent } from '@/hooks/use-generate-managed-agent';
import { useManagedAgentRuntimeEnabled } from '@/hooks/use-managed-agent-runtime-enabled';
import { useManagedClaudeCredentialsFlow } from '@/hooks/use-managed-claude-credentials-flow';
import { useTelemetry } from '@/hooks/use-telemetry';
import { useVerifyManagedCredentials } from '@/hooks/use-verify-managed-credentials';
import { clearPersistedAgentTemplateId } from '@/utils/agent-template-identity';
import { QueryKeys } from '@/utils/query-keys';
import { TelemetryEvent } from '@/utils/telemetry';
import type { AgentGenerationMode } from './connect-agent-form';
import { ConnectAgentForm } from './connect-agent-form';
import { type ConnectSummary } from './connect-summary';
import { type ConnectorId, getConnectorById, pickInitialConnector } from './connector-options';
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

function resolveRuntime(connectorId: ConnectorId | undefined): RuntimeType | undefined {
  return getConnectorById(connectorId)?.runtime;
}

function dropdownStatusFor(verify: VerifyStatus, hasIntegration: boolean): ConnectorIntegrationStatus {
  if (hasIntegration || verify === 'valid') return 'valid';
  if (verify === 'invalid') return 'missing';

  return 'idle';
}

/**
 * Snapshot of the connect-phase form values that drives the right-side preview illustration
 * for managed Claude connectors. Includes everything the illustration needs to render the
 * agent card without having to introspect any of the form's internal state.
 */
export type ConnectAgentPreview = {
  connectorId?: ConnectorId;
  isClaudeSelected: boolean;
  isDemoCredential: boolean;
  isPending: boolean;
  name?: string;
  description?: string;
  instructions?: string;
  mcpServers: ReadonlyArray<string>;
  tools: ReadonlyArray<string>;
};

type ConnectAgentStepProps = {
  onAgentCreated: (agent: AgentResponse, summary: ConnectSummary) => void;
  onRuntimeChange?: (runtime: RuntimeType) => void;
  onPreviewChange?: (preview: ConnectAgentPreview) => void;
  /**
   * Optional template id (Sanity `id.current`) coming from an external deep-link. When it matches a
   * fetched template, the prompt + agent fields are prefilled once and the persisted id is cleared.
   */
  agentTemplateId?: string;
  /**
   * Onboarding "demo agent" mode: renders only the simplified brain step (prompt + suggestions +
   * demo-credentials hint + full-width "Setup agent" CTA). The connector, template, and
   * credentials surfaces are hidden — the agent is provisioned on the Novu demo Claude credentials.
   */
  simplifiedDemo?: boolean;
};

const DEFAULT_TEMPLATE = DEFAULT_AGENT_TEMPLATES[0];

const MIN_PROMPT_LENGTH = 8;

export function ConnectAgentStep({
  onAgentCreated,
  onRuntimeChange,
  onPreviewChange,
  agentTemplateId,
  simplifiedDemo,
}: ConnectAgentStepProps) {
  const isManagedEnabled = useManagedAgentRuntimeEnabled();
  const telemetry = useTelemetry();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const { submit, isPending } = useCreateAgentMutation();
  const { integrations } = useFetchIntegrations();
  const {
    templates: agentSuggestions,
    isFetching: isFetchingAgentSuggestions,
    refresh: refreshAgentSuggestions,
  } = useAgentSuggestions();
  // Sanity-backed templates are used only to resolve a deep-linked `agentTemplateId` (marketing
  // website) into a concrete template for direct provisioning — kept separate from the AI
  // suggestion pills above.
  const { templates: sanityAgentTemplates, isLoading: isLoadingSanityTemplates } = useAgentTemplates();
  const verifyMutation = useVerifyManagedCredentials();
  const { mutateAsync: createIntegration, isPending: isSavingIntegration } = useCreateIntegration();

  const [connectorId, setConnectorId] = useState<ConnectorId | undefined>(() =>
    simplifiedDemo ? undefined : pickInitialConnector(isManagedEnabled)
  );
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
  // True while an agent is being provisioned directly from a deep-linked template (marketing
  // website). Swaps the brain form for a preview skeleton until `onAgentCreated` morphs the parent
  // into the real agent preview.
  const [isAutoProvisioningFromTemplate, setIsAutoProvisioningFromTemplate] = useState(false);
  // Set when the user cancels generation, so the in-flight submit bails before creating the agent
  // even if the aborted request's promise resolves (or settles late) instead of rejecting.
  const generationCancelledRef = useRef(false);
  // Guards the deep-link template prefill so it runs at most once per template id.
  const appliedTemplateIdRef = useRef<string | undefined>(undefined);

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
  // The AI "Generate from prompt" surface is reserved for managed Claude (when the
  // managed-runtime flag is on). The Custom Scaffold flow always renders the manual
  // ScratchAgentFields form so teams writing their own runtime see exactly the inputs they
  // need to fill in.
  const useAiGeneration = isClaudeSelected && isManagedEnabled;
  const isDemoProviderSelected = isDemoManagedClaudeIntegrationSelected(integrations, selectedIntegrationId);
  // The demo (Novu-managed Claude) integration exposes no provider vault, so provider-managed MCPs
  // can never be configured on it. Drop them from the suggestion pills so onboarding only advertises
  // tools the user can actually wire up; the API enforces the same filter at provision time.
  const displayedAgentTemplates = useMemo(() => {
    if (!isDemoProviderSelected) return agentSuggestions;

    return agentSuggestions.map((template) => ({
      ...template,
      suggestedMcpServers: filterDemoConfigurableMcpIds(template.suggestedMcpServers),
      mcpServers: template.mcpServers?.filter((server) => !isProviderManagedMcp(server.id)),
    }));
  }, [agentSuggestions, isDemoProviderSelected]);
  const isExistingMode =
    isClaudeSelected &&
    !isDemoProviderSelected &&
    (useAiGeneration ? generationMode === 'existing' : templateSelection.kind === 'existing');
  const isScratchMode =
    isScratchRuntime ||
    (useAiGeneration && generationMode === 'manual') ||
    (!useAiGeneration && templateSelection.kind === 'scratch');
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
    if (!runtime) {
      return;
    }

    onRuntimeChange?.(runtime);
  }, [runtime, onRuntimeChange]);

  const dropdownStatus = dropdownStatusFor(verifyStatus, Boolean(selectedIntegrationId));
  const isSubmitBusy = isPending || isGenerating || isPromptSubmitInFlight || isAutoProvisioningFromTemplate;

  // Provision an agent directly from a deep-linked Sanity template — no LLM prompt step. The
  // template's name, instructions, and MCP servers are applied as managed-runtime overrides so the
  // agent is created with exactly what the marketing-site template advertised.
  const provisionAgentFromTemplate = useCallback(
    async (template: AgentTemplate) => {
  if (!connectorId || !runtime) {
    return;
  }

      setIsAutoProvisioningFromTemplate(true);

      const effectiveName = template.name;
      const effectiveIdentifier = slugify(template.name);
      const effectiveInstructions = template.instructions;
      const requestedMcpServers = isDemoProviderSelected
        ? filterDemoConfigurableMcpIds([...template.suggestedMcpServers])
        : template.suggestedMcpServers;

      const managedOverrides: ManagedAgentRuntimeOverrides = {
        systemPrompt: template.instructions,
        mcpServers: requestedMcpServers,
      };

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
        mcpServers: requestedMcpServers,
        tools: [],
      };

      await submit(
        {
          name: effectiveName.trim(),
          identifier: effectiveIdentifier.trim(),
          instructions: effectiveInstructions.trim(),
          description: effectiveInstructions.trim(),
          apiKey: apiKey.trim(),
          runtime,
          isExistingMode: false,
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
          onSuccess: (agent) => {
            telemetry(TelemetryEvent.ONBOARDING_CONNECT_AGENT_CREATED, {
              runtime,
              connectorId,
              mode: 'template',
              templateKind: 'template',
              agentIdentifier: agent.identifier,
              isExistingMode: false,
            });
            onAgentCreated(agent, summary);
          },
          onError: (err) => {
            setIsAutoProvisioningFromTemplate(false);
            const message = err instanceof NovuApiError ? err.message : 'Could not create agent.';
            showErrorToast(message, 'Create failed');
          },
        }
      );
    },
    [
      connectorId,
      templateSelection,
      apiKey,
      externalAgentId,
      externalEnvironmentId,
      externalWorkspaceId,
      region,
      selectedIntegrationId,
      integrationName,
      runtime,
      selectedConnector?.providerId,
      isDemoProviderSelected,
      submit,
      telemetry,
      onAgentCreated,
    ]
  );

  // Deep-link auto-provision: when an `agentTemplateId` matches a fetched Sanity template, create the
  // agent straight from the template (name + instructions + MCPs) once the managed runtime and a
  // credential are ready. Runs once per id, then clears the persisted id so a refresh doesn't re-run.
  useEffect(() => {
    if (!agentTemplateId) return;
    if (appliedTemplateIdRef.current === agentTemplateId) return;
    if (!currentEnvironment) return;
    if (!isClaudeSelected || !isManagedEnabled) return;
    if (!selectedIntegrationId) return;

    const template = findAgentTemplateById(sanityAgentTemplates, agentTemplateId);
    if (!template) return;

    appliedTemplateIdRef.current = agentTemplateId;
    clearPersistedAgentTemplateId();
    void provisionAgentFromTemplate(template);
  }, [
    agentTemplateId,
    sanityAgentTemplates,
    currentEnvironment,
    isClaudeSelected,
    isManagedEnabled,
    selectedIntegrationId,
    provisionAgentFromTemplate,
  ]);

  // A deep-linked template (marketing website) bypasses the brain form entirely: show the agent
  // preview skeleton from the first render — while integrations/templates load and the agent is
  // provisioned — instead of briefly flashing the suggestion pills + prompt. Fall back to the form
  // only once we can prove there's nothing to provision (managed runtime unavailable, or the id
  // resolves to no known Sanity template), so the user is never stranded on the skeleton.
  const deepLinkTemplateUnresolvable =
    Boolean(agentTemplateId) &&
    !isLoadingSanityTemplates &&
    !findAgentTemplateById(sanityAgentTemplates, agentTemplateId ?? '');
  const showTemplateProvisioningSkeleton =
    isAutoProvisioningFromTemplate ||
    (Boolean(agentTemplateId) && isManagedEnabled && isClaudeSelected && !deepLinkTemplateUnresolvable);

  // Build a preview snapshot for the right-side illustration. Pulls instructions / MCPs from
  // the active template (or the manual form fields when "Start from scratch" is picked) so the
  // managed Claude card stays in sync with what the user is choosing before submission.
  useEffect(() => {
    if (!onPreviewChange) return;

    const trimmedInstructions = instructions.trim();
    const trimmedName = name.trim();
    let previewName: string | undefined;
    let previewInstructions: string | undefined;
    let previewMcpServers: ReadonlyArray<string> = [];

    if (useAiGeneration) {
      // In the prompt flow, the connect-phase form doesn't carry a name/instructions yet — those
      // only materialize after the LLM call inside handleSubmit. While in `manual` mode the
      // textareas are bound to `name`/`instructions` directly, so surface those for the preview.
      if (generationMode === 'manual') {
        previewName = trimmedName || undefined;
        previewInstructions = trimmedInstructions || undefined;
      }
    } else if (templateSelection.kind === 'template') {
      previewName = templateSelection.template.name;
      previewInstructions = templateSelection.template.instructions;
      previewMcpServers = isDemoProviderSelected
        ? filterDemoConfigurableMcpIds(templateSelection.template.suggestedMcpServers)
        : templateSelection.template.suggestedMcpServers;
    } else if (templateSelection.kind === 'scratch') {
      previewName = trimmedName || undefined;
      previewInstructions = trimmedInstructions || undefined;
    }

    onPreviewChange({
      connectorId,
      isClaudeSelected,
      isDemoCredential: isDemoProviderSelected,
      isPending: isSubmitBusy,
      name: previewName,
      instructions: previewInstructions,
      mcpServers: previewMcpServers,
      tools: [],
    });
  }, [
    onPreviewChange,
    connectorId,
    isClaudeSelected,
    isDemoProviderSelected,
    isSubmitBusy,
    useAiGeneration,
    generationMode,
    templateSelection,
    name,
    instructions,
  ]);

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
      if (simplifiedDemo) {
        const { userIntegrations } = partitionClaudeManagedIntegrations(matchingAnthropicIntegrations);

        if (userIntegrations.length > 0) {
          setSelectedIntegrationId(userIntegrations[0]._id);
          setCredentialsPanelVisible(false);
        } else {
          setSelectedIntegrationId(undefined);
          setCredentialsPanelVisible(false);
        }
      } else {
        setSelectedIntegrationId(matchingAnthropicIntegrations[0]._id);
        setCredentialsPanelVisible(false);
      }
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
    simplifiedDemo,
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

  const handleConnectorChange = useCallback(
    (id: ConnectorId) => {
      setConnectorId(id);

      const next = getConnectorById(id);
      if (!next?.providerId) {
        setSelectedIntegrationId(undefined);
        setCredentialsPanelVisible(false);
        resetCredentials();
      }
    },
    [resetCredentials]
  );

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
    generationCancelledRef.current = true;
    cancelGeneration();
    setIsPromptSubmitInFlight(false);
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
    });
  }, [selectedConnector?.providerId, apiKey, externalWorkspaceId, region, verifyMutation, verifyStatus]);

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

    if (!connectorId || !runtime) {
      showErrorToast('Select where your agent runs before continuing.', 'Connect agent');

      return;
    }

    const isPromptGenerationMode = useAiGeneration && generationMode === 'prompt';

    let generated: GeneratedManagedAgent | null = null;
    let effectiveName = name;
    let effectiveIdentifier = identifier;
    let effectiveInstructions = instructions;
    let effectiveDescription = instructions;
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

      generationCancelledRef.current = false;
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

      // The user cancelled while the request was in flight — bail before creating the agent even
      // if the aborted request still resolved.
      if (generationCancelledRef.current) {
        setIsPromptSubmitInFlight(false);

        return;
      }

      effectiveName = generated.name;
      effectiveIdentifier = generated.identifier;
      effectiveDescription = generated.description;
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
      description: effectiveDescription,
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

    // Surface the MCPs/tools captured for the just-created agent so downstream consumers (like
    // the managed-Claude preview illustration) can show them. Prefer the LLM-generated payload
    // — when absent (static template / scratch), fall back to the template's suggested MCPs so
    // the preview keeps showing what the user picked.
    const requestedSummaryMcpServers =
      managedOverrides?.mcpServers ??
      (templateSelection.kind === 'template' ? templateSelection.template.suggestedMcpServers : []);
    // Mirror the API's demo provisioning filter so the summary reflects the MCPs that were actually
    // wired up — provider-managed servers are dropped on the demo integration.
    const summaryMcpServers = isDemoProviderSelected
      ? filterDemoConfigurableMcpIds([...requestedSummaryMcpServers])
      : requestedSummaryMcpServers;
    const summaryTools = managedOverrides?.tools ?? [];

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
      mcpServers: summaryMcpServers,
      tools: summaryTools,
    };

    await submit(
      {
        name: effectiveName.trim(),
        identifier: effectiveIdentifier.trim(),
        instructions: effectiveInstructions.trim(),
        description: effectiveDescription.trim(),
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
        onSuccess: (agent) => {
          telemetry(TelemetryEvent.ONBOARDING_CONNECT_AGENT_CREATED, {
            runtime,
            connectorId,
            mode: useAiGeneration ? generationMode : 'template',
            templateKind: templateSelection.kind,
            agentIdentifier: agent.identifier,
            isExistingMode,
          });
          onAgentCreated(agent, summary);
        },
        onError: (err) => {
          setIsPromptSubmitInFlight(false);
          const message = err instanceof NovuApiError ? err.message : 'Could not create agent.';
          telemetry(TelemetryEvent.ONBOARDING_CONNECT_AGENT_CREATE_FAILED, {
            runtime,
            connectorId,
            message,
          });
          showErrorToast(message, 'Create failed');
        },
      }
    );
  };

  const submitButton = simplifiedDemo ? (
    <Button
      type="submit"
      variant="secondary"
      mode="filled"
      size="2xs"
      className="mt-1 w-full justify-center gap-1"
      isLoading={isSubmitBusy}
      trailingIcon={RiArrowRightSLine}
    >
      Connect your agent
    </Button>
  ) : (
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

  if (showTemplateProvisioningSkeleton) {
    return (
      <div className="relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6">
        <div
          className="absolute bottom-0 left-[22px] top-0 w-px"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
          }}
        />
        <AgentPreviewSkeleton />
      </div>
    );
  }

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
        isScratchRuntime={isScratchRuntime}
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
                suggestions: displayedAgentTemplates,
                onSelectSuggestion: handleSelectSuggestion,
                onRegenerateSuggestions: refreshAgentSuggestions,
                isRegeneratingSuggestions: isFetchingAgentSuggestions,
                textareaRef: promptTextareaRef,
                isGenerating: isSubmitBusy,
                generationSteps: GENERATION_STEPS,
                onCancelGeneration: handleCancelGeneration,
                // Cancel is only meaningful while the LLM call is in flight; once it returns
                // we are mid-provisioning at Anthropic and there is nothing to abort, so keep
                // the button visible (avoids a layout shift) but disable it.
                isCancelDisabled: !isGenerating,
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
        submitSlot={useAiGeneration || isScratchRuntime ? submitButton : undefined}
        simplifiedDemo={simplifiedDemo}
      />

      {!simplifiedDemo && !useAiGeneration && !isScratchRuntime && (
        <div className="flex flex-col gap-2 pl-6">{submitButton}</div>
      )}
    </form>
  );
}
