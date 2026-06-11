import {
  AgentRuntimeProviderIdEnum,
  FeatureFlagsKeysEnum,
  filterDemoConfigurableMcpIds,
  type IIntegration,
  IntegrationKindEnum,
  isProviderManagedMcp,
  slugify,
} from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine, RiArrowRightUpLine, RiCloseLine, RiLoopLeftLine } from 'react-icons/ri';
import type { GeneratedManagedAgent } from '@/api/agents';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useAgentSuggestions } from '@/hooks/use-agent-suggestions';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { GenerationCancelledError, useGenerateManagedAgent } from '@/hooks/use-generate-managed-agent';
import { useManagedClaudeCredentialsFlow } from '@/hooks/use-managed-claude-credentials-flow';
import { useVerifyManagedCredentials } from '@/hooks/use-verify-managed-credentials';
import { AGENTS_DOCS_OVERVIEW_URL } from '@/utils/agent-docs';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import { AgentSuggestionPills } from '../onboarding/connect-agent/agent-suggestion-pills';
import { GenerationStatus, type GenerationStep } from '../onboarding/connect-agent/generation-status';
import { PromptInput } from '../onboarding/connect-agent/prompt-input';
import {
  getClaudeManagedAgentIntegrations,
  getPreferredClaudeManagedIntegration,
  isDemoManagedClaudeIntegrationSelected,
} from './connectors/claude-managed-integrations';
import {
  ConnectorIntegrationDropdown,
  type ConnectorIntegrationStatus,
} from './connectors/connector-integration-dropdown';
import {
  type ConnectorId,
  type ConnectorOption,
  getConnectorById,
  getConnectorIdForProviderId,
} from './connectors/connector-options';
import {
  type AgentTemplate,
  buildManagedIntegrationCredentials,
  buildVerifyCredentialsPayload,
  buildVerifyFingerprint,
  ConfigureCredentialsSection,
  type CreateAgentForm,
  type CreateAgentFormErrors,
  ExistingAgentFields,
  hasCompleteManagedCredentials,
  hasFormErrors,
  type ManagedAgentRuntimeOverrides,
  ScratchAgentFields,
  type VerifyStatus,
  validateCreateAgentForm,
  validateManagedCredentialFields,
} from './create-agent-fields';

const DOCS_AGENTS_LEARN_MORE_HREF = AGENTS_DOCS_OVERVIEW_URL;

export type { CreateAgentForm } from './create-agent-fields';

type CreateAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: CreateAgentForm) => Promise<void>;
  isSubmitting: boolean;
  initialName?: string;
  initialInstructions?: string;
  /** When provided, the dialog opens in prompt mode with the textarea prefilled. */
  initialPrompt?: string;
};

const DEFAULT_CONNECTOR_ID: ConnectorId = 'claude';

/**
 * Mirrors the onboarding step's `AgentGenerationMode` so the dialog reuses the same prompt /
 * manual / existing affordances. Keeping the shape identical also keeps the suggestion-pill
 * handler trivial: it always switches to `'prompt'` and pre-fills the textarea.
 */
type AgentGenerationMode = 'prompt' | 'manual' | 'existing';

const GENERATION_STEPS: ReadonlyArray<GenerationStep> = [
  { id: 'spinning', text: 'Spinning up a fresh agent' },
  { id: 'coffee', text: 'Sipping a little bit of coffee' },
  { id: 'system-prompt', text: 'Crafting the system prompt' },
  { id: 'tools', text: 'Picking the right tools' },
  { id: 'mcp', text: 'Wiring up MCP servers' },
  { id: 'skills', text: 'Selecting starter skills' },
  { id: 'agent', text: 'Generating your agent' },
];

const MIN_PROMPT_LENGTH = 8;

// Matches the dialog footer button's `h-14` (56px) so the animated status sits inside the footer
// instead of stretching it taller while the agent is being generated.
const FOOTER_STATUS_HEIGHT = 56;

const PROMPT_HEADER: Record<
  Exclude<AgentGenerationMode, 'existing'>,
  { label: string; toggleLabel: string; toggleTo: Exclude<AgentGenerationMode, 'existing'>; toggleIcon?: 'sparkles' }
> = {
  prompt: {
    label: 'Generate from prompt',
    toggleLabel: 'Create manually',
    toggleTo: 'manual',
  },
  manual: {
    label: 'Create manually',
    toggleLabel: 'Generate from prompt',
    toggleTo: 'prompt',
    toggleIcon: 'sparkles',
  },
};

function dropdownStatusFor(verify: VerifyStatus, hasIntegration: boolean): ConnectorIntegrationStatus {
  if (hasIntegration || verify === 'valid') return 'valid';
  if (verify === 'invalid') return 'missing';

  return 'idle';
}

function resolveInitialGenerationMode({
  initialName,
  initialInstructions,
  initialPrompt,
}: {
  initialName?: string;
  initialInstructions?: string;
  initialPrompt?: string;
}): AgentGenerationMode {
  if (initialPrompt) return 'prompt';
  if (initialName || initialInstructions) return 'manual';

  return 'prompt';
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialName,
  initialInstructions,
  initialPrompt,
}: CreateAgentDialogProps) {
  const isManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { integrations } = useFetchIntegrations();
  const {
    templates: agentTemplates,
    isFetching: isFetchingAgentTemplates,
    refresh: refreshAgentTemplates,
  } = useAgentSuggestions();
  const verifyMutation = useVerifyManagedCredentials();
  const { mutateAsync: createIntegration, isPending: isSavingIntegration } = useCreateIntegration();

  const [connectorId, setConnectorId] = useState<ConnectorId>(DEFAULT_CONNECTOR_ID);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(undefined);
  const [credentialsPanelVisible, setCredentialsPanelVisible] = useState(false);
  const [credentialsPanelExpanded, setCredentialsPanelExpanded] = useState(true);
  // A caller-provided prompt opens in prompt mode; a pre-populated name/instructions defaults to
  // manual mode so the form is already filled out. Otherwise show the prompt textarea by default.
  const [generationMode, setGenerationMode] = useState<AgentGenerationMode>(() =>
    resolveInitialGenerationMode({ initialName, initialInstructions, initialPrompt })
  );
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [promptError, setPromptError] = useState<string | undefined>(undefined);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Keeps the dialog in a busy state for the whole submit lifecycle — across the LLM call (prompt
  // mode), the create-agent mutation, and the brief gap before the parent flips `open` to false.
  // Without it the status animation and the submit button briefly snap back to their idle styles
  // while Radix is still running the dialog's close animation, which reads as a "blink".
  const [isSubmitInFlight, setIsSubmitInFlight] = useState(false);
  const [name, setName] = useState(initialName ?? '');
  const [identifier, setIdentifier] = useState(initialName ? slugify(initialName) : '');
  const [instructions, setInstructions] = useState(initialInstructions ?? '');
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
  const [integrationName, setIntegrationName] = useState('');
  const [externalAgentId, setExternalAgentId] = useState('');
  const [externalEnvironmentId, setExternalEnvironmentId] = useState('');
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);
  const [isIntegrationNameTouched, setIsIntegrationNameTouched] = useState(false);
  // Brief confirmation badge that flashes in the dropdown trigger right after a successful save.
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const savedBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the integration id from "Save integration" until it appears in the fetched list, so the
  // auto-select effect does not overwrite it or reopen the credentials section during refetch.
  const pinnedIntegrationIdRef = useRef<string | null>(null);
  // On dialog open, prefer the first managed integration across provider types (e.g. AWS Claude
  // when Anthropic has none). Cleared once the user picks a connector or a provider match is found.
  const preferAnyManagedIntegrationRef = useRef(true);

  const {
    generate: generateManagedAgent,
    isPending: isGenerating,
    cancel: cancelGeneration,
  } = useGenerateManagedAgent();

  const selectedConnector = getConnectorById(connectorId);
  const isManagedClaudeConnector = selectedConnector?.runtime === 'claude';
  const runtime = selectedConnector?.runtime ?? 'scratch';
  // The "Generate from prompt" surface is reserved for managed Claude (when the managed-runtime
  // flag is on). The Custom Scaffold flow always renders the manual ScratchAgentFields form, so
  // teams writing their own runtime see exactly the inputs they need to fill in.
  const useAiGeneration = isManagedClaudeConnector && isManagedEnabled;
  const isDemoProviderSelected = isDemoManagedClaudeIntegrationSelected(integrations, selectedIntegrationId);
  // The demo (Novu-managed Claude) integration exposes no provider vault, so provider-managed MCPs
  // can never be configured on it. Drop them from the suggestion pills so the demo only advertises
  // tools the user can actually wire up; the API enforces the same filter at provision time.
  const displayedAgentTemplates = useMemo(() => {
    if (!isDemoProviderSelected) return agentTemplates;

    return agentTemplates.map((template) => ({
      ...template,
      suggestedMcpServers: filterDemoConfigurableMcpIds(template.suggestedMcpServers),
      mcpServers: template.mcpServers?.filter((server) => !isProviderManagedMcp(server.id)),
    }));
  }, [agentTemplates, isDemoProviderSelected]);
  const scope: 'create' | 'existing' = generationMode === 'existing' ? 'existing' : 'create';
  const showScopeTabs = isManagedClaudeConnector && !isDemoProviderSelected;
  const showManagedOptions = isManagedEnabled;

  // Hide managed connectors when the feature flag is off — the dropdown still lists them visually,
  // but selecting a managed connector should be impossible. We achieve this by short-circuiting to
  // 'custom-scaffold' when managed is disabled.
  useEffect(() => {
    if (!open) return;
    if (showManagedOptions) return;
    if (selectedConnector?.runtime !== 'claude') return;

    setConnectorId('custom-scaffold');
  }, [open, showManagedOptions, selectedConnector?.runtime]);

  const matchingAnthropicIntegrations = useMemo(() => {
    if (!selectedConnector?.providerId) return [];

    return getClaudeManagedAgentIntegrations(integrations, selectedConnector.providerId);
  }, [integrations, selectedConnector?.providerId]);

  // Auto-select the first existing integration of the chosen provider on open / when the connector
  // changes / when integrations finish loading. If none exist, open the inline credentials section.
  // Skipped when the user is setting up new credentials (panel visible, no integration selected), so we
  // don't overwrite their choice with an existing integration.
  useEffect(() => {
    if (!open) return;
    if (isSubmitting) return;

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
      preferAnyManagedIntegrationRef.current = false;
      setSelectedIntegrationId(matchingAnthropicIntegrations[0]._id);

      return;
    }

    if (preferAnyManagedIntegrationRef.current) {
      const preferred = getPreferredClaudeManagedIntegration(integrations);
      if (preferred) {
        const connectorForPreferred = getConnectorIdForProviderId(preferred.providerId);
        if (connectorForPreferred) {
          setConnectorId(connectorForPreferred);
        }
        preferAnyManagedIntegrationRef.current = false;
        setSelectedIntegrationId(preferred._id);

        return;
      }
    }

    preferAnyManagedIntegrationRef.current = false;
    setSelectedIntegrationId(undefined);
    setCredentialsPanelVisible(true);
    setCredentialsPanelExpanded(true);
  }, [
    open,
    isSubmitting,
    selectedConnector?.providerId,
    matchingAnthropicIntegrations,
    selectedIntegrationId,
    credentialsPanelVisible,
    integrations,
  ]);

  // Default integration name = "<Provider> <next-index>"
  useEffect(() => {
    if (!credentialsPanelVisible || !selectedConnector?.providerLabel) return;
    if (isIntegrationNameTouched || integrationName.trim()) return;

    const nextIndex = matchingAnthropicIntegrations.length + 1;
    setIntegrationName(`${selectedConnector.providerLabel} ${nextIndex}`);
  }, [
    credentialsPanelVisible,
    selectedConnector?.providerLabel,
    matchingAnthropicIntegrations.length,
    integrationName,
    isIntegrationNameTouched,
  ]);

  useEffect(() => {
    if (!open) return;

    setName(initialName ?? '');
    setIdentifier(initialName ? slugify(initialName) : '');
    setInstructions(initialInstructions ?? '');
    setIsIdentifierTouched(false);
    setErrors({});
    setGenerationMode(resolveInitialGenerationMode({ initialName, initialInstructions, initialPrompt }));
    setPrompt(initialPrompt ?? '');
    setPromptError(undefined);
  }, [open, initialName, initialInstructions, initialPrompt]);

  const reset = useCallback(() => {
    setConnectorId(DEFAULT_CONNECTOR_ID);
    setSelectedIntegrationId(undefined);
    setCredentialsPanelVisible(false);
    setCredentialsPanelExpanded(true);
    setGenerationMode('prompt');
    setPrompt('');
    setPromptError(undefined);
    setIsSubmitInFlight(false);
    setName('');
    setIdentifier('');
    setInstructions('');
    resetCredentials();
    setIntegrationName('');
    setIsIntegrationNameTouched(false);
    setExternalAgentId('');
    setExternalEnvironmentId('');
    setErrors({});
    setIsIdentifierTouched(false);
    setShowSavedBadge(false);
    pinnedIntegrationIdRef.current = null;
    preferAnyManagedIntegrationRef.current = true;
    if (savedBadgeTimerRef.current) {
      clearTimeout(savedBadgeTimerRef.current);
      savedBadgeTimerRef.current = null;
    }
  }, [resetCredentials]);

  const prevOpenRef = useRef(open);

  // Reset form state only after the dialog has closed — not while it is still visible (e.g. during
  // the exit animation or between successful submit and the parent setting `open` to false).
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      reset();
    }

    prevOpenRef.current = open;
  }, [open, reset]);

  useEffect(() => {
    return () => {
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
    };
  }, []);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  // Clicking a suggestion when the AI surface is available lands the user in prompt mode with the
  // textarea pre-filled. Mirrors `handleSelectSuggestion` in `connect-agent-step.tsx`.
  const handleSelectAiSuggestion = useCallback((suggestion: AgentTemplate) => {
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
  }, []);

  const handleSelectConnector = (id: ConnectorId) => {
    preferAnyManagedIntegrationRef.current = false;
    setConnectorId(id);

    const next = getConnectorById(id);
    // Switching to a non-managed connector clears the credentials view.
    if (!next?.providerId) {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(false);
      resetCredentials();
    }
    // Switching away from Claude collapses the "existing" mode back to the default surface,
    // since only the managed Claude flow supports adopting a remote agent.
    if (next?.runtime !== 'claude' && generationMode === 'existing') {
      setGenerationMode('prompt');
      setExternalAgentId('');
      setExternalEnvironmentId('');
    }
  };

  // Demo Novu-managed Claude credentials cannot adopt an existing provider agent.
  useEffect(() => {
    if (!open) return;
    if (!isDemoProviderSelected) return;
    if (generationMode !== 'existing') return;

    setGenerationMode('prompt');
    setExternalAgentId('');
    setExternalEnvironmentId('');
  }, [open, isDemoProviderSelected, generationMode]);

  const handleGenerationModeChange = useCallback((next: AgentGenerationMode) => {
    setGenerationMode(next);
    if (next === 'prompt' || next === 'manual') {
      setExternalAgentId('');
      setExternalEnvironmentId('');
    }
    if (next === 'manual') {
      setPromptError(undefined);
    }
  }, []);

  const handlePromptChange = useCallback((next: string) => {
    setPrompt(next);
    setPromptError(undefined);
  }, []);

  const handleCancelGeneration = useCallback(() => {
    cancelGeneration();
  }, [cancelGeneration]);

  const handleSelectIntegration = (integration: { _id: string }) => {
    setSelectedIntegrationId(integration._id);
    setCredentialsPanelVisible(false);
    resetCredentials();
    setErrors((prev) => ({
      ...prev,
      apiKey: undefined,
      integrationName: undefined,
      region: undefined,
      externalWorkspaceId: undefined,
    }));
  };

  const handleRequestSetupCredentials = (option: ConnectorOption) => {
    setSelectedIntegrationId(undefined);
    setCredentialsPanelVisible(true);
    setCredentialsPanelExpanded(true);

    if (option.providerLabel && !isIntegrationNameTouched && !integrationName.trim()) {
      const nextIndex = getClaudeManagedAgentIntegrations(integrations, option.providerId).length + 1;
      setIntegrationName(`${option.providerLabel} ${nextIndex}`);
    }
  };

  const handleVerify = () => {
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
        const message = err instanceof Error ? err.message : 'Invalid';
        setVerifyStatus('invalid');
        setVerifyMessage(message);
        showErrorToast(`Verification failed: ${message}`, 'Verification failed');
      },
    });
  };

  const handleApiKeyChange = (next: string) => {
    setApiKey(next);
    setErrors((prev) => ({ ...prev, apiKey: undefined }));
  };

  const handleSaveIntegration = async () => {
    if (!selectedConnector?.providerId) return;

    const trimmedName = integrationName.trim();
    const fields = { apiKey, region, externalWorkspaceId };

    if (!trimmedName) return;
    if (!hasCompleteManagedCredentials(selectedConnector.providerId, fields)) return;

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
      setShowSavedBadge(true);
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
      savedBadgeTimerRef.current = setTimeout(() => setShowSavedBadge(false), 2500);
      showSuccessToast(`${trimmedName} is ready to use.`, 'Integration saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save integration.';
      showErrorToast(message, 'Save failed');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const isExistingMode = runtime === 'claude' && !isDemoProviderSelected && generationMode === 'existing';
    const isPromptGenerationMode = useAiGeneration && generationMode === 'prompt';

    let generated: GeneratedManagedAgent | null = null;
    let effectiveName = name;
    let effectiveIdentifier = identifier;
    let effectiveInstructions = instructions;
    // In scratch mode the single textarea IS the description, so it maps to `description`. In
    // managed manual mode that same textarea is the Claude system prompt and must NOT leak into the
    // description. The prompt-generation path overrides this with `generated.description` below.
    let effectiveDescription = runtime === 'scratch' ? instructions : '';
    let managedOverrides: ManagedAgentRuntimeOverrides | undefined;

    if (isPromptGenerationMode) {
      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt.length < MIN_PROMPT_LENGTH) {
        setPromptError(`Add at least ${MIN_PROMPT_LENGTH} characters describing your agent.`);

        return;
      }

      if (isManagedClaudeConnector && !selectedIntegrationId && selectedConnector?.providerId) {
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

      setIsSubmitInFlight(true);

      try {
        generated = await generateManagedAgent({
          prompt: trimmedPrompt,
          runtime: isManagedClaudeConnector ? 'managed' : 'self-hosted',
        });
      } catch (err) {
        setIsSubmitInFlight(false);

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
      effectiveDescription = generated.description;
      managedOverrides = {
        systemPrompt: generated.systemPrompt,
        tools: generated.tools,
        mcpServers: generated.mcpServers,
        skills: generated.skills,
      };
    }

    const nextErrors = validateCreateAgentForm({
      name: effectiveName,
      description: effectiveDescription,
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
    });

    if (hasFormErrors(nextErrors)) {
      setErrors(nextErrors);
      setIsSubmitInFlight(false);

      return;
    }

    setErrors({});

    // Idempotent in prompt mode (already set before the LLM call); the important case is manual
    // mode, where we cover the create-agent mutation here so the busy state stays continuous
    // until the parent flips `open` to false.
    setIsSubmitInFlight(true);

    try {
      await onSubmit({
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
      });
      // Parent closes the dialog in onSuccess — do not reset here while the modal is still open.
      // The flag is cleared in `reset()` once the dialog finishes closing.
    } catch {
      // Caller surfaces a toast; keep the dialog open so the user can retry.
      setIsSubmitInFlight(false);
    }
  };

  const dropdownStatus = dropdownStatusFor(verifyStatus, Boolean(selectedIntegrationId));
  const showCredentialsSection = isManagedClaudeConnector && credentialsPanelVisible;
  const isSubmitBusy = isSubmitting || isGenerating || isSubmitInFlight;
  const promptHeader = generationMode === 'existing' ? null : PROMPT_HEADER[generationMode];

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
                Add agent
              </DialogTitle>
              <DialogDescription className="text-text-soft text-label-xs leading-4">
                Give your agent a unified way to communicate with your users.{' '}
                <a
                  href={DOCS_AGENTS_LEARN_MORE_HREF}
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
              <CompactButton size="md" variant="ghost" icon={RiCloseLine}>
                <span className="sr-only">Close</span>
              </CompactButton>
            </DialogClose>
          </div>
        </div>

        <div className="border-stroke-soft border-y" />

        <form onSubmit={handleSubmit} className="min-w-0">
          <div className="bg-background flex min-w-0 max-h-[70vh] flex-col gap-5 overflow-y-auto p-4">
            <div className="flex flex-col gap-2">
              <span className="text-text-strong text-label-xs font-medium">Where do you want your agent?</span>
              <ConnectorIntegrationDropdown
                selectedConnectorId={connectorId}
                selectedIntegrationId={selectedIntegrationId}
                integrations={integrations}
                status={dropdownStatus}
                showStatusBadge={showSavedBadge}
                onSelectConnector={handleSelectConnector}
                onSelectIntegration={handleSelectIntegration}
                onRequestSetupCredentials={handleRequestSetupCredentials}
              />

              {showCredentialsSection && selectedConnector?.providerId ? (
                <ConfigureCredentialsSection
                  providerId={selectedConnector.providerId as AgentRuntimeProviderIdEnum}
                  providerLabel={selectedConnector.providerLabel ?? 'Provider'}
                  integrationName={integrationName}
                  apiKey={apiKey}
                  externalWorkspaceId={externalWorkspaceId}
                  region={region}
                  errors={errors}
                  disabled={isSubmitting}
                  status={verifyStatus}
                  statusMessage={verifyMessage}
                  isSaving={isSavingIntegration}
                  showSaveButton={!selectedIntegrationId}
                  expanded={credentialsPanelExpanded}
                  onExpandedChange={setCredentialsPanelExpanded}
                  onIntegrationNameChange={(next) => {
                    setIsIntegrationNameTouched(true);
                    setIntegrationName(next);
                    setErrors((prev) => ({ ...prev, integrationName: undefined }));
                  }}
                  onApiKeyChange={handleApiKeyChange}
                  onExternalWorkspaceIdChange={(next) => {
                    setExternalWorkspaceId(next);
                    setErrors((prev) => ({ ...prev, externalWorkspaceId: undefined }));
                  }}
                  onRegionChange={(next) => {
                    setRegion(next);
                    setErrors((prev) => ({ ...prev, region: undefined }));
                  }}
                  onVerify={handleVerify}
                  onSave={handleSaveIntegration}
                />
              ) : null}
            </div>

            {showScopeTabs && (
              <SegmentedControl
                value={scope}
                onValueChange={(v) => handleGenerationModeChange(v === 'existing' ? 'existing' : 'prompt')}
              >
                <SegmentedControlList
                  className="rounded-[5px] bg-bg-muted p-1"
                  floatingBgClassName="rounded-[1px]"
                >
                  <SegmentedControlTrigger value="create" className="text-label-xs" disabled={isSubmitBusy}>
                    Create new agent
                  </SegmentedControlTrigger>
                  <SegmentedControlTrigger value="existing" className="text-label-xs" disabled={isSubmitBusy}>
                    Connect existing agent
                  </SegmentedControlTrigger>
                </SegmentedControlList>
              </SegmentedControl>
            )}

            {generationMode === 'existing' ? (
              <ExistingAgentFields
                externalAgentId={externalAgentId}
                externalEnvironmentId={externalEnvironmentId}
                errors={errors}
                disabled={isSubmitBusy}
                onExternalAgentIdChange={(next) => {
                  setExternalAgentId(next);
                  setErrors((prev) => ({ ...prev, externalAgentId: undefined }));
                }}
                onExternalEnvironmentIdChange={(next) => {
                  setExternalEnvironmentId(next);
                  setErrors((prev) => ({ ...prev, externalEnvironmentId: undefined }));
                }}
              />
            ) : useAiGeneration ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2.5">
                  {promptHeader && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-strong text-label-xs font-medium leading-4">{promptHeader.label}</span>
                      {!isSubmitBusy && (
                        <button
                          type="button"
                          onClick={() => handleGenerationModeChange(promptHeader.toggleTo)}
                          className={cn(
                            'text-text-sub hover:text-text-strong text-label-xs inline-flex items-center gap-0.5 font-medium leading-4',
                            'disabled:cursor-not-allowed disabled:opacity-50'
                          )}
                        >
                          {promptHeader.toggleIcon === 'sparkles' && (
                            <BroomSparkle className="text-feature size-3.5 shrink-0" aria-hidden />
                          )}
                          <span>{promptHeader.toggleLabel}</span>
                          <RiArrowRightSLine className="size-3.5 shrink-0" aria-hidden />
                        </button>
                      )}
                    </div>
                  )}

                  {generationMode === 'prompt' && (
                    // Generation status and Cancel live in the dialog footer so the body height
                    // stays stable while the agent is being created from a prompt.
                    <PromptInput
                      value={prompt}
                      onChange={handlePromptChange}
                      disabled={isSubmitting}
                      errorMessage={promptError}
                      textareaRef={promptTextareaRef}
                      isGenerating={isSubmitBusy}
                    />
                  )}

                  {generationMode === 'manual' && (
                    <ScratchAgentFields
                      name={name}
                      identifier={identifier}
                      instructions={instructions}
                      errors={errors}
                      isIdentifierTouched={isIdentifierTouched}
                      isClaudeSelected={isManagedClaudeConnector}
                      disabled={isSubmitBusy}
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
                    />
                  )}
                </div>

                {generationMode === 'prompt' && (
                  <div className="flex min-w-0 items-center">
                    <AgentSuggestionPills
                      className="min-w-0 flex-1"
                      suggestions={displayedAgentTemplates}
                      onSelect={handleSelectAiSuggestion}
                      disabled={isSubmitBusy}
                      isLoading={isFetchingAgentTemplates}
                    />
                    <AnimatePresence initial={false}>
                      {!isFetchingAgentTemplates && (
                        <motion.div
                          key="regenerate-suggestions"
                          initial={{ opacity: 0, maxWidth: 0, marginLeft: 0 }}
                          animate={{ opacity: 1, maxWidth: 24, marginLeft: 8 }}
                          exit={{ opacity: 0, maxWidth: 0, marginLeft: 0 }}
                          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                          className="shrink-0 overflow-hidden"
                        >
                          <Button
                            aria-label="Regenerate suggestions"
                            title="Regenerate suggestions"
                            className="h-6 shrink-0 [&_svg]:size-2.5"
                            variant="secondary"
                            mode="ghost"
                            size="2xs"
                            trailingIcon={RiLoopLeftLine}
                            disabled={isSubmitBusy}
                            onClick={refreshAgentTemplates}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              <ScratchAgentFields
                name={name}
                identifier={identifier}
                instructions={instructions}
                errors={errors}
                isIdentifierTouched={isIdentifierTouched}
                isClaudeSelected={isManagedClaudeConnector}
                disabled={isSubmitBusy}
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
              />
            )}
          </div>

          <div className="bg-bg-weak border-stroke-soft flex items-center gap-3 border-t px-4 py-3">
            {isSubmitBusy && generationMode === 'prompt' ? (
              <>
                <div className="flex h-14 -mt-3 -mb-3 min-w-0 flex-1 items-center">
                  <GenerationStatus
                    steps={GENERATION_STEPS}
                    containerHeight={FOOTER_STATUS_HEIGHT}
                    className="w-full"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  mode="outline"
                  size="xs"
                  className="shrink-0 gap-1"
                  onClick={handleCancelGeneration}
                  // Cancel is only meaningful while the LLM call is in flight; once it
                  // returns we are mid-provisioning at Anthropic and there is nothing to
                  // abort, so keep the button visible (avoids a layout shift) but disable it.
                  disabled={!isGenerating}
                  trailingIcon={RiCloseLine}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                mode="gradient"
                size="xs"
                type="submit"
                className="ml-auto"
                isLoading={isSubmitBusy}
                trailingIcon={RiArrowRightSLine}
              >
                Setup agent
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
