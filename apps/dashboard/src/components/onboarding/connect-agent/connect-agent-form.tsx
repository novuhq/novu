import { AgentRuntimeProviderIdEnum, type IIntegration } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { RiArrowRightSLine, RiCloseLine, RiInformation2Line, RiLoopLeftLine } from 'react-icons/ri';
import { isDemoManagedClaudeIntegrationSelected } from '@/components/agents/connectors/claude-managed-integrations';
import {
  ConnectorIntegrationDropdown,
  type ConnectorIntegrationStatus,
} from '@/components/agents/connectors/connector-integration-dropdown';
import { type ConnectorOption, getConnectorById } from '@/components/agents/connectors/connector-options';
import {
  type AgentTemplate,
  ConfigureCredentialsSection,
  type CreateAgentFormErrors,
  ExistingAgentFields,
  ScratchAgentFields,
  type VerifyStatus,
} from '@/components/agents/create-agent-fields';
import { SetupStep } from '@/components/agents/setup-guide-primitives';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { AgentSuggestionPills } from './agent-suggestion-pills';
import type { ConnectorId } from './connector-options';
import { GenerationStatus, type GenerationStep } from './generation-status';
import { PromptInput } from './prompt-input';
import { TemplateDropdown, type TemplateSelection } from './template-dropdown';

export type AgentGenerationMode = 'prompt' | 'manual' | 'existing';

export type AgentGenerationBindings = {
  mode: AgentGenerationMode;
  onModeChange: (next: AgentGenerationMode) => void;
  prompt: string;
  onPromptChange: (next: string) => void;
  promptError?: string;
  suggestions: AgentTemplate[];
  onSelectSuggestion: (suggestion: AgentTemplate) => void;
  /** Regenerates the suggestion pills on the server. When omitted, the regenerate button is hidden. */
  onRegenerateSuggestions?: () => void;
  /** When true, the pills show a loading skeleton and the regenerate button is disabled. */
  isRegeneratingSuggestions?: boolean;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  /**
   * When true, the prompt textarea becomes read-only and the rotating status animation +
   * Cancel button are rendered below it.
   */
  isGenerating?: boolean;
  generationSteps?: ReadonlyArray<GenerationStep>;
  onCancelGeneration?: () => void;
  /**
   * When true, the Cancel button stays visible during the generating state but is
   * disabled. Use after the LLM call has settled and the agent is being provisioned.
   */
  isCancelDisabled?: boolean;
};

type ConnectAgentFormProps = {
  connectorId: ConnectorId;
  isClaudeSelected: boolean;
  /**
   * When true, the connector runs on the Custom Scaffold (self-hosted) runtime. We collapse the
   * second setup step into a plain manual form (no AI prompt UI, no template dropdown, no
   * suggestion pills) so teams writing their own runtime see exactly the inputs they need.
   */
  isScratchRuntime: boolean;
  apiKey: string;
  externalWorkspaceId: string;
  region: string;

  templateSelection: TemplateSelection;
  isExistingMode: boolean;
  isScratchMode: boolean;
  showExistingOption: boolean;
  existingOptionIcon?: ReactNode;

  name: string;
  identifier: string;
  instructions: string;
  isIdentifierTouched: boolean;

  externalAgentId: string;
  externalEnvironmentId: string;

  errors: CreateAgentFormErrors;

  /**
   * When true, every input/dropdown renders disabled. The component still calls the change
   * handlers for completeness, but consumers should provide noop handlers in this mode.
   */
  disabled?: boolean;

  // Integration / credentials state
  integrations: IIntegration[] | undefined;
  selectedIntegrationId?: string;
  dropdownStatus?: ConnectorIntegrationStatus;
  showSavedBadge?: boolean;
  credentialsPanelVisible: boolean;
  credentialsPanelExpanded: boolean;
  integrationName: string;
  verifyStatus: VerifyStatus;
  verifyMessage?: string;
  isSavingIntegration?: boolean;

  onConnectorChange: (next: ConnectorId) => void;
  onTemplateChange: (next: TemplateSelection) => void;
  onApiKeyChange: (next: string) => void;
  onExternalWorkspaceIdChange: (next: string) => void;
  onRegionChange: (next: string) => void;
  onNameChange: (next: string) => void;
  onIdentifierChange: (next: string) => void;
  onIdentifierTouched: () => void;
  onInstructionsChange: (next: string) => void;
  onExternalAgentIdChange: (next: string) => void;
  onExternalEnvironmentIdChange: (next: string) => void;

  onSelectIntegration: (integration: IIntegration) => void;
  onRequestSetupCredentials: (option: ConnectorOption) => void;
  onCredentialsExpandedChange: (expanded: boolean) => void;
  onIntegrationNameChange: (next: string) => void;
  onVerify: () => void;
  onSaveIntegration: () => void;

  /**
   * When provided, the second setup step switches from the static template dropdown to the
   * AI "Generate from prompt" experience (textarea + mode toggle + status animation). Available
   * capabilities (mode, prompt, suggestions, generation status) are passed through this bundle
   * so the form stays presentation-only.
   */
  aiGeneration?: AgentGenerationBindings;
  /**
   * Rendered at the bottom of the section 2 right column (directly underneath the prompt input /
   * manual / existing fields) when the AI flow is active. Lets the parent place the form submit
   * button next to the inputs instead of at the bottom of the page.
   */
  submitSlot?: ReactNode;
  /**
   * Onboarding "demo agent" mode: collapses the form to a single brain step rendered as a
   * stacked single column — suggestion pills + prompt + a "Using Demo credentials…" hint. The
   * connector dropdown, template step, scope tabs, and credentials panel are all omitted because
   * onboarding always uses the Novu-provided demo Claude credentials. Requires `aiGeneration`.
   */
  simplifiedDemo?: boolean;
};

const RIGHT_HEADER_BY_MODE: Record<
  Exclude<AgentGenerationMode, 'existing'>,
  { label: string; toggleLabel: string; toggleTo: AgentGenerationMode; toggleIcon?: 'sparkles' }
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

export type AgentScope = 'create' | 'existing';

/**
 * Segmented tab control that splits the AI flow into "Create new agent" vs "Connect existing
 * agent". Mirrors the visual treatment of {@link SetupModeToggle}. Only rendered when the
 * selected connector supports linking an existing agent (Claude managed runtime today).
 */
function AgentScopeTabs({
  scope,
  onChange,
  disabled,
}: {
  scope: AgentScope;
  onChange: (next: AgentScope) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex w-fit items-start gap-px rounded-[5px] bg-bg-weak p-px">
      <button
        type="button"
        aria-pressed={scope === 'create'}
        disabled={disabled}
        onClick={() => onChange('create')}
        className={cn(
          'flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-label-xs font-medium transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          scope === 'create'
            ? 'bg-bg-white text-text-strong shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]'
            : 'text-text-sub hover:text-text-strong'
        )}
      >
        Create new agent
      </button>
      <button
        type="button"
        aria-pressed={scope === 'existing'}
        disabled={disabled}
        onClick={() => onChange('existing')}
        className={cn(
          'flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-label-xs font-medium transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          scope === 'existing'
            ? 'bg-bg-white text-text-strong shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]'
            : 'text-text-sub hover:text-text-strong'
        )}
      >
        Connect existing agent
      </button>
    </div>
  );
}

export function ConnectAgentForm({
  connectorId,
  isClaudeSelected,
  isScratchRuntime,
  apiKey,
  externalWorkspaceId,
  region,
  templateSelection,
  isExistingMode,
  isScratchMode,
  showExistingOption,
  existingOptionIcon,
  name,
  identifier,
  instructions,
  isIdentifierTouched,
  externalAgentId,
  externalEnvironmentId,
  errors,
  disabled,
  integrations,
  selectedIntegrationId,
  dropdownStatus = 'idle',
  showSavedBadge = false,
  credentialsPanelVisible,
  credentialsPanelExpanded,
  integrationName,
  verifyStatus,
  verifyMessage,
  isSavingIntegration,
  onConnectorChange,
  onTemplateChange,
  onApiKeyChange,
  onExternalWorkspaceIdChange,
  onRegionChange,
  onNameChange,
  onIdentifierChange,
  onIdentifierTouched,
  onInstructionsChange,
  onExternalAgentIdChange,
  onExternalEnvironmentIdChange,
  onSelectIntegration,
  onRequestSetupCredentials,
  onCredentialsExpandedChange,
  onIntegrationNameChange,
  onVerify,
  onSaveIntegration,
  aiGeneration,
  submitSlot,
  simplifiedDemo,
}: ConnectAgentFormProps) {
  if (simplifiedDemo && (aiGeneration || isScratchRuntime)) {
    const demoSelectedConnector = getConnectorById(connectorId);
    const showDemoCredentialsSection =
      isClaudeSelected && credentialsPanelVisible && Boolean(demoSelectedConnector?.providerId);
    const isDemoCredentialSelected = isDemoManagedClaudeIntegrationSelected(integrations, selectedIntegrationId);
    // Custom-code connectors carry no credential to set up, so picking one completes the step.
    const isConnectorStepCompleted = isScratchRuntime || Boolean(selectedIntegrationId);

    const demoConnectorStep = (
      <SetupStep
        index={1}
        status={isConnectorStepCompleted ? 'completed' : 'current'}
        sectionLabel="2/7 SETUP AGENT BRAIN"
        title="Choose your connector"
        description="Your Connector is the LLM runtime where the agent is hosted and executed. Novu connects to your Connector to bring your agents to where you work"
        fullWidthContent={
          <div className="mt-1 flex w-full max-w-[500px] flex-col gap-2">
            <ConnectorIntegrationDropdown
              selectedConnectorId={connectorId}
              selectedIntegrationId={selectedIntegrationId}
              integrations={integrations}
              status={dropdownStatus}
              showStatusBadge={showSavedBadge}
              disabled={disabled}
              onSelectConnector={onConnectorChange}
              onSelectIntegration={onSelectIntegration}
              onRequestSetupCredentials={onRequestSetupCredentials}
            />
            <p className="text-text-soft text-label-xs flex items-center gap-1 font-normal leading-4">
              <RiInformation2Line className="size-3.5" aria-hidden /> The platform that hosts and runs your agent.
            </p>
            {showDemoCredentialsSection && demoSelectedConnector?.providerId ? (
              <ConfigureCredentialsSection
                providerId={demoSelectedConnector.providerId as AgentRuntimeProviderIdEnum}
                providerLabel={demoSelectedConnector.providerLabel ?? 'Provider'}
                integrationName={integrationName}
                apiKey={apiKey}
                externalWorkspaceId={externalWorkspaceId}
                region={region}
                errors={errors}
                disabled={disabled}
                status={verifyStatus}
                statusMessage={verifyMessage}
                isSaving={isSavingIntegration}
                expanded={credentialsPanelExpanded}
                onExpandedChange={onCredentialsExpandedChange}
                onIntegrationNameChange={onIntegrationNameChange}
                onApiKeyChange={onApiKeyChange}
                onExternalWorkspaceIdChange={onExternalWorkspaceIdChange}
                onRegionChange={onRegionChange}
                onVerify={onVerify}
                onSave={onSaveIntegration}
              />
            ) : null}
          </div>
        }
      />
    );

    // Custom-code (scratch) connectors keep the same stepped layout: the connector step stays in
    // place and the prompt step swaps for the manual agent form. The created agent then follows
    // the regular custom-code flow (channel selection + bridge setup).
    if (isScratchRuntime || !aiGeneration) {
      return (
        <>
          {demoConnectorStep}
          <SetupStep
            index={2}
            status="current"
            title="Configure your agent"
            description="Give your agent a name, identifier, and description. Wire up your own tools, MCPs, and integrations in code."
            fullWidthContent={
              <div className="mt-5 flex max-w-[500px] flex-col gap-3">
                <ScratchAgentFields
                  name={name}
                  identifier={identifier}
                  instructions={instructions}
                  errors={errors}
                  isIdentifierTouched={isIdentifierTouched}
                  isClaudeSelected={false}
                  disabled={disabled}
                  onNameChange={onNameChange}
                  onIdentifierChange={onIdentifierChange}
                  onIdentifierTouched={onIdentifierTouched}
                  onInstructionsChange={onInstructionsChange}
                />
                {submitSlot}
              </div>
            }
          />
        </>
      );
    }

    return (
      <>
        {demoConnectorStep}
        <SetupStep
          index={2}
          status="current"
          title="What should your agent do?"
          description={
            isDemoCredentialSelected
              ? "We'll provide demo Claude credentials so you can set up an agent without bringing your own keys. Later, you can replace it with your own agent and credentials."
              : 'Describe what your agent should do — we configure the tools, MCPs, skills, and system prompt for you.'
          }
          fullWidthContent={
          <div className="flex flex-col gap-3 mt-5 max-w-[500px]">
            {aiGeneration.suggestions.length > 0 && (
              <div className="flex min-w-0 items-center">
                <AnimatePresence initial={false}>
                  {!aiGeneration.isRegeneratingSuggestions && (
                    <motion.span
                      key="try-label"
                      initial={{ opacity: 0, maxWidth: 0, marginRight: 0 }}
                      animate={{ opacity: 1, maxWidth: 36, marginRight: 8 }}
                      exit={{ opacity: 0, maxWidth: 0, marginRight: 0 }}
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="text-text-soft text-label-xs shrink-0 overflow-hidden font-medium leading-4 whitespace-nowrap"
                    >
                      Try:
                    </motion.span>
                  )}
                </AnimatePresence>
                <AgentSuggestionPills
                  className="min-w-0 flex-1"
                  suggestions={aiGeneration.suggestions}
                  onSelect={aiGeneration.onSelectSuggestion}
                  disabled={disabled || (aiGeneration.isGenerating ?? false)}
                  isLoading={aiGeneration.isRegeneratingSuggestions ?? false}
                />
                {aiGeneration.onRegenerateSuggestions && (
                  <AnimatePresence initial={false}>
                    {!aiGeneration.isRegeneratingSuggestions && (
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
                          disabled={disabled || (aiGeneration.isGenerating ?? false)}
                          onClick={aiGeneration.onRegenerateSuggestions}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            )}
            {/*
             * Keep the prompt + helper text mounted while generating — pass `isGenerating={false}`
             * so `PromptInput` does not swap in its own cancel/status UI (we render those below the
             * button instead) and keeps the helper text visible. `disabled` makes the textarea
             * read-only during generation.
             */}
            <PromptInput
              value={aiGeneration.prompt}
              onChange={aiGeneration.onPromptChange}
              disabled={disabled || (aiGeneration.isGenerating ?? false)}
              errorMessage={aiGeneration.promptError}
              textareaRef={aiGeneration.textareaRef}
              helperText={
                isDemoCredentialSelected
                  ? 'Using Demo credentials for Claude Managed Agents for onboarding'
                  : 'You can always edit the agent once created'
              }
            />
            {/*
             * Render the cancel/submit toggle as different element types (button vs a wrapping
             * div) so React never reuses the same DOM <button> and silently flips its `type` from
             * "button" to "submit" mid-click — which would let the browser submit the form on the
             * very click that was meant to cancel, firing a brand-new generation request.
             */}
            {aiGeneration.isGenerating ? (
              <Button
                key="brain-step-cancel"
                type="button"
                variant="secondary"
                mode="outline"
                size="2xs"
                className="mt-1 w-full justify-center gap-1"
                onClick={aiGeneration.onCancelGeneration}
                disabled={aiGeneration.isCancelDisabled}
                trailingIcon={RiCloseLine}
              >
                Cancel
              </Button>
            ) : (
              <div key="brain-step-submit" className="contents">
                {submitSlot}
              </div>
            )}
            {aiGeneration.isGenerating && aiGeneration.generationSteps && aiGeneration.generationSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <GenerationStatus steps={aiGeneration.generationSteps} />
              </motion.div>
            )}
          </div>
          }
        />
      </>
    );
  }

  const selectedConnector = getConnectorById(connectorId);
  const showCredentialsSection = isClaudeSelected && credentialsPanelVisible && Boolean(selectedConnector?.providerId);
  const usePromptUi = Boolean(aiGeneration);
  const aiMode = aiGeneration?.mode ?? 'prompt';
  const scope: AgentScope = aiMode === 'existing' ? 'existing' : 'create';
  // Total steps across the full onboarding flow:
  //   brain (2) + email-address (1) + channel (1) + provider guide (3 reserved) + handler (0 for managed, 3 for self-hosted)
  // Managed-runtime connectors don't render the agent-handler section, so the total is 7 there.
  // The email-address step is always counted here because the brain section runs before the agent
  // is created — we can't yet inspect whether the cloud shared-inbound address will be provisioned.
  // Self-hosted deployments without `NOVU_AGENT_SHARED_INBOUND_DOMAIN` skip that step downstream
  // and the channel step will re-anchor its own numbering in `agent-setup-steps`.
  const totalOnboardingSteps = isClaudeSelected ? 7 : 10;
  // The prompt/manual sub-toggle in the right-column header only exists in `'create'` scope.
  // In `'existing'` scope the segmented tabs above replace it, so we omit it entirely.
  const header = aiMode === 'existing' ? null : RIGHT_HEADER_BY_MODE[aiMode];
  const showScopeTabs = usePromptUi && showExistingOption;
  const { stepTitle, stepDescription } = resolveStepCopy({ isScratchRuntime, usePromptUi, scope });

  return (
    <>
      <SetupStep
        index={1}
        status="completed"
        sectionLabel={`1/${totalOnboardingSteps} SETUP AGENT BRAIN`}
        title="Where do you want your agent?"
        description="The agent is hosted in the selected connector and Novu manages the communication across channels."
        rightContent={
          <div className="flex w-full flex-col gap-2.5">
            <div className="flex items-center gap-1">
              <span className="text-text-strong text-label-xs font-medium">Connector Integration</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                    <RiInformation2Line className="size-3.5" aria-hidden />
                  </span>
                </TooltipTrigger>
                <TooltipContent>The connector integration is the way Novu communicates with the agent.</TooltipContent>
              </Tooltip>
            </div>
            <ConnectorIntegrationDropdown
              selectedConnectorId={connectorId}
              selectedIntegrationId={selectedIntegrationId}
              integrations={integrations}
              status={dropdownStatus}
              showStatusBadge={showSavedBadge}
              disabled={disabled}
              onSelectConnector={onConnectorChange}
              onSelectIntegration={onSelectIntegration}
              onRequestSetupCredentials={onRequestSetupCredentials}
            />
            {isClaudeSelected && (
              <p className="text-text-soft text-label-xs font-normal leading-4 flex items-center gap-1">
                <RiInformation2Line className="size-3.5" aria-hidden /> Novu hosts the loop on Anthropic Managed Agents.
              </p>
            )}
            {showCredentialsSection && selectedConnector?.providerId ? (
              <ConfigureCredentialsSection
                providerId={selectedConnector.providerId as AgentRuntimeProviderIdEnum}
                providerLabel={selectedConnector.providerLabel ?? 'Provider'}
                integrationName={integrationName}
                apiKey={apiKey}
                externalWorkspaceId={externalWorkspaceId}
                region={region}
                errors={errors}
                disabled={disabled}
                status={verifyStatus}
                statusMessage={verifyMessage}
                isSaving={isSavingIntegration}
                expanded={credentialsPanelExpanded}
                onExpandedChange={onCredentialsExpandedChange}
                onIntegrationNameChange={onIntegrationNameChange}
                onApiKeyChange={onApiKeyChange}
                onExternalWorkspaceIdChange={onExternalWorkspaceIdChange}
                onRegionChange={onRegionChange}
                onVerify={onVerify}
                onSave={onSaveIntegration}
              />
            ) : null}
          </div>
        }
      />

      <SetupStep
        index={2}
        status="completed"
        title={stepTitle}
        description={stepDescription}
        headerSlot={
          showScopeTabs && aiGeneration ? (
            <AgentScopeTabs
              scope={scope}
              disabled={disabled}
              onChange={(next) => aiGeneration.onModeChange(next === 'existing' ? 'existing' : 'prompt')}
            />
          ) : null
        }
        rightContent={
          <div className="flex w-full flex-col gap-2.5">
            {renderRightColumn({
              isScratchRuntime,
              usePromptUi,
              aiGeneration,
              header,
              disabled,
              isClaudeSelected,
              isExistingMode,
              name,
              identifier,
              instructions,
              isIdentifierTouched,
              externalAgentId,
              externalEnvironmentId,
              errors,
              templateSelection,
              showExistingOption,
              existingOptionIcon,
              onTemplateChange,
              onNameChange,
              onIdentifierChange,
              onIdentifierTouched,
              onInstructionsChange,
              onExternalAgentIdChange,
              onExternalEnvironmentIdChange,
              submitSlot,
            })}
          </div>
        }
        extraContent={
          isScratchRuntime ? null : (
            <div className="flex flex-col gap-5">
              {renderExtraContent({
                usePromptUi,
                aiMode,
                aiGeneration,
                disabled,
                isClaudeSelected,
                isExistingMode,
                isScratchMode,
                name,
                identifier,
                instructions,
                isIdentifierTouched,
                externalAgentId,
                externalEnvironmentId,
                errors,
                onNameChange,
                onIdentifierChange,
                onIdentifierTouched,
                onInstructionsChange,
                onExternalAgentIdChange,
                onExternalEnvironmentIdChange,
              })}
            </div>
          )
        }
      />
    </>
  );
}

function resolveStepCopy({
  isScratchRuntime,
  usePromptUi,
  scope,
}: {
  isScratchRuntime: boolean;
  usePromptUi: boolean;
  scope: AgentScope;
}): { stepTitle: string; stepDescription: string } {
  if (isScratchRuntime) {
    return {
      stepTitle: 'Configure your agent',
      stepDescription:
        'Give your agent a name, identifier, and description. Wire up your own tools, MCPs, and integrations in code.',
    };
  }

  if (usePromptUi) {
    if (scope === 'existing') {
      return {
        stepTitle: 'Connect your existing agent',
        stepDescription:
          'Paste the Claude Agent ID and Environment ID of an existing managed agent and Novu will route conversations to it.',
      };
    }

    return {
      stepTitle: 'Start from a template',
      stepDescription:
        'Pick a starter or describe what your agent should do — we configure the tools, MCPs, skills, and system prompt for you.',
    };
  }

  return {
    stepTitle: 'Start from a template',
    stepDescription:
      'Create an agent and deploy it to Anthropic from the starter templates. You can also bring in existing agents later.',
  };
}

type RightColumnArgs = {
  isScratchRuntime: boolean;
  usePromptUi: boolean;
  aiGeneration: AgentGenerationBindings | undefined;
  header: RightHeader | null;
  disabled?: boolean;
  isClaudeSelected: boolean;
  isExistingMode: boolean;
  name: string;
  identifier: string;
  instructions: string;
  isIdentifierTouched: boolean;
  externalAgentId: string;
  externalEnvironmentId: string;
  errors: CreateAgentFormErrors;
  templateSelection: TemplateSelection;
  showExistingOption: boolean;
  existingOptionIcon?: ReactNode;
  onTemplateChange: (next: TemplateSelection) => void;
  onNameChange: (next: string) => void;
  onIdentifierChange: (next: string) => void;
  onIdentifierTouched: () => void;
  onInstructionsChange: (next: string) => void;
  onExternalAgentIdChange: (next: string) => void;
  onExternalEnvironmentIdChange: (next: string) => void;
  submitSlot?: ReactNode;
};

function renderRightColumn({
  isScratchRuntime,
  usePromptUi,
  aiGeneration,
  header,
  disabled,
  isClaudeSelected,
  isExistingMode,
  name,
  identifier,
  instructions,
  isIdentifierTouched,
  externalAgentId,
  externalEnvironmentId,
  errors,
  templateSelection,
  showExistingOption,
  existingOptionIcon,
  onTemplateChange,
  onNameChange,
  onIdentifierChange,
  onIdentifierTouched,
  onInstructionsChange,
  onExternalAgentIdChange,
  onExternalEnvironmentIdChange,
  submitSlot,
}: RightColumnArgs) {
  if (isScratchRuntime) {
    return (
      <>
        <ScratchAgentFields
          isColumnsLayout
          name={name}
          identifier={identifier}
          instructions={instructions}
          errors={errors}
          isIdentifierTouched={isIdentifierTouched}
          isClaudeSelected={false}
          disabled={disabled}
          onNameChange={onNameChange}
          onIdentifierChange={onIdentifierChange}
          onIdentifierTouched={onIdentifierTouched}
          onInstructionsChange={onInstructionsChange}
        />
        {submitSlot}
      </>
    );
  }

  if (usePromptUi && aiGeneration) {
    return (
      <PromptModeContent
        aiGeneration={aiGeneration}
        header={header}
        disabled={disabled}
        isExistingMode={isExistingMode}
        name={name}
        identifier={identifier}
        instructions={instructions}
        isIdentifierTouched={isIdentifierTouched}
        externalAgentId={externalAgentId}
        externalEnvironmentId={externalEnvironmentId}
        errors={errors}
        onNameChange={onNameChange}
        onIdentifierChange={onIdentifierChange}
        onIdentifierTouched={onIdentifierTouched}
        onInstructionsChange={onInstructionsChange}
        onExternalAgentIdChange={onExternalAgentIdChange}
        onExternalEnvironmentIdChange={onExternalEnvironmentIdChange}
        submitSlot={submitSlot}
      />
    );
  }

  return (
    <>
      <TemplateDropdown
        selection={templateSelection}
        onSelect={onTemplateChange}
        showExistingOption={showExistingOption}
        existingOptionIcon={existingOptionIcon}
        disabled={disabled}
      />
      {isClaudeSelected && templateSelection.kind !== 'existing' && (
        <p className="text-text-soft text-label-xs font-normal leading-4 flex items-center gap-1">
          <RiInformation2Line className="size-3.5" aria-hidden /> Sent to Claude as the system prompt.
        </p>
      )}
    </>
  );
}

type ExtraContentArgs = {
  usePromptUi: boolean;
  aiMode: AgentGenerationMode;
  aiGeneration: AgentGenerationBindings | undefined;
  disabled?: boolean;
  isClaudeSelected: boolean;
  isExistingMode: boolean;
  isScratchMode: boolean;
  name: string;
  identifier: string;
  instructions: string;
  isIdentifierTouched: boolean;
  externalAgentId: string;
  externalEnvironmentId: string;
  errors: CreateAgentFormErrors;
  onNameChange: (next: string) => void;
  onIdentifierChange: (next: string) => void;
  onIdentifierTouched: () => void;
  onInstructionsChange: (next: string) => void;
  onExternalAgentIdChange: (next: string) => void;
  onExternalEnvironmentIdChange: (next: string) => void;
};

function renderExtraContent({
  usePromptUi,
  aiMode,
  aiGeneration,
  disabled,
  isClaudeSelected,
  isExistingMode,
  isScratchMode,
  name,
  identifier,
  instructions,
  isIdentifierTouched,
  externalAgentId,
  externalEnvironmentId,
  errors,
  onNameChange,
  onIdentifierChange,
  onIdentifierTouched,
  onInstructionsChange,
  onExternalAgentIdChange,
  onExternalEnvironmentIdChange,
}: ExtraContentArgs) {
  if (usePromptUi && aiGeneration && aiMode === 'prompt') {
    return (
      <div className="flex min-w-0 items-center">
        <AgentSuggestionPills
          className="min-w-0 flex-1"
          suggestions={aiGeneration.suggestions}
          onSelect={aiGeneration.onSelectSuggestion}
          disabled={disabled}
          isLoading={aiGeneration.isRegeneratingSuggestions ?? false}
        />
        {aiGeneration.onRegenerateSuggestions && (
          <AnimatePresence initial={false}>
            {!aiGeneration.isRegeneratingSuggestions && (
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
                  disabled={disabled}
                  onClick={aiGeneration.onRegenerateSuggestions}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  if (!usePromptUi && isExistingMode) {
    return (
      <ExistingAgentFields
        externalAgentId={externalAgentId}
        externalEnvironmentId={externalEnvironmentId}
        errors={errors}
        disabled={disabled}
        onExternalAgentIdChange={onExternalAgentIdChange}
        onExternalEnvironmentIdChange={onExternalEnvironmentIdChange}
      />
    );
  }

  if (!usePromptUi && isScratchMode) {
    return (
      <ScratchAgentFields
        isColumnsLayout
        name={name}
        identifier={identifier}
        instructions={instructions}
        errors={errors}
        isIdentifierTouched={isIdentifierTouched}
        isClaudeSelected={isClaudeSelected}
        disabled={disabled}
        onNameChange={onNameChange}
        onIdentifierChange={onIdentifierChange}
        onIdentifierTouched={onIdentifierTouched}
        onInstructionsChange={onInstructionsChange}
      />
    );
  }

  return null;
}

type RightHeader = (typeof RIGHT_HEADER_BY_MODE)[Exclude<AgentGenerationMode, 'existing'>];

type PromptModeContentProps = {
  aiGeneration: AgentGenerationBindings;
  /**
   * Header bindings for the prompt/manual sub-toggle. Pass `null` when the scope tabs above
   * already provide the affordance (i.e. when in `'existing'` mode).
   */
  header: RightHeader | null;
  disabled?: boolean;
  isExistingMode: boolean;
  name: string;
  identifier: string;
  instructions: string;
  isIdentifierTouched: boolean;
  externalAgentId: string;
  externalEnvironmentId: string;
  errors: CreateAgentFormErrors;
  onNameChange: (next: string) => void;
  onIdentifierChange: (next: string) => void;
  onIdentifierTouched: () => void;
  onInstructionsChange: (next: string) => void;
  onExternalAgentIdChange: (next: string) => void;
  onExternalEnvironmentIdChange: (next: string) => void;
  submitSlot?: ReactNode;
};

function PromptModeContent({
  aiGeneration,
  header,
  disabled,
  isExistingMode,
  name,
  identifier,
  instructions,
  isIdentifierTouched,
  externalAgentId,
  externalEnvironmentId,
  errors,
  onNameChange,
  onIdentifierChange,
  onIdentifierTouched,
  onInstructionsChange,
  onExternalAgentIdChange,
  onExternalEnvironmentIdChange,
  submitSlot,
}: PromptModeContentProps) {
  const ToggleIcon = header?.toggleIcon === 'sparkles' ? BroomSparkle : null;

  return (
    <>
      {header && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-strong text-label-xs font-medium leading-4">{header.label}</span>
          {!aiGeneration.isGenerating && (
            <button
              type="button"
              onClick={() => aiGeneration.onModeChange(header.toggleTo)}
              disabled={disabled}
              className={cn(
                'text-text-sub hover:text-text-strong text-label-xs inline-flex items-center gap-0.5 font-medium leading-4',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {ToggleIcon && <ToggleIcon className="text-feature size-3.5 shrink-0" aria-hidden />}
              <span>{header.toggleLabel}</span>
              <RiArrowRightSLine className="size-3.5 shrink-0" aria-hidden />
            </button>
          )}
        </div>
      )}

      {aiGeneration.mode === 'prompt' && (
        <PromptInput
          value={aiGeneration.prompt}
          onChange={aiGeneration.onPromptChange}
          disabled={disabled}
          errorMessage={aiGeneration.promptError}
          textareaRef={aiGeneration.textareaRef}
          isGenerating={aiGeneration.isGenerating}
          generationSteps={aiGeneration.generationSteps}
          onCancelGeneration={aiGeneration.onCancelGeneration}
          isCancelDisabled={aiGeneration.isCancelDisabled}
          helperText="You can always edit the agent once created"
        />
      )}

      {aiGeneration.mode === 'manual' && (
        <ScratchAgentFields
          isColumnsLayout
          name={name}
          identifier={identifier}
          instructions={instructions}
          errors={errors}
          isIdentifierTouched={isIdentifierTouched}
          isClaudeSelected
          disabled={disabled}
          onNameChange={onNameChange}
          onIdentifierChange={onIdentifierChange}
          onIdentifierTouched={onIdentifierTouched}
          onInstructionsChange={onInstructionsChange}
        />
      )}

      {aiGeneration.mode === 'existing' && isExistingMode && (
        <ExistingAgentFields
          externalAgentId={externalAgentId}
          externalEnvironmentId={externalEnvironmentId}
          errors={errors}
          disabled={disabled}
          onExternalAgentIdChange={onExternalAgentIdChange}
          onExternalEnvironmentIdChange={onExternalEnvironmentIdChange}
        />
      )}

      {!aiGeneration.isGenerating && submitSlot}
    </>
  );
}
