import { AgentRuntimeProviderIdEnum, type IIntegration } from '@novu/shared';
import type { ReactNode } from 'react';
import { RiArrowRightSLine, RiInformation2Line } from 'react-icons/ri';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { AgentSuggestionPills } from './agent-suggestion-pills';
import type { ConnectorId } from './connector-options';
import type { GenerationStep } from './generation-status';
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
  /**
   * Marks the Custom Scaffold flow. Drives copy and tone: scratch agents only get a
   * generated name/identifier/system prompt — no tools/MCPs/skills are attached.
   */
  isScratchRuntime?: boolean;
};

type ConnectAgentFormProps = {
  connectorId: ConnectorId;
  isClaudeSelected: boolean;
  apiKey: string;
  externalWorkspaceId: string;

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
  onVerify: (apiKey: string) => void;
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
  apiKey,
  externalWorkspaceId,
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
}: ConnectAgentFormProps) {
  const selectedConnector = getConnectorById(connectorId);
  const showCredentialsSection = isClaudeSelected && credentialsPanelVisible && Boolean(selectedConnector?.providerId);
  const usePromptUi = Boolean(aiGeneration);
  const isScratchRuntime = Boolean(aiGeneration?.isScratchRuntime);
  const aiMode = aiGeneration?.mode ?? 'prompt';
  const scope: AgentScope = aiMode === 'existing' ? 'existing' : 'create';
  // Total steps across the full onboarding flow:
  //   brain (2) + channel (1) + provider guide (3 reserved) + handler (0 for managed, 3 for self-hosted)
  // Managed-runtime connectors don't render the agent-handler section, so the total is 6 there.
  const totalOnboardingSteps = isClaudeSelected ? 6 : 9;
  // The prompt/manual sub-toggle in the right-column header only exists in `'create'` scope.
  // In `'existing'` scope the segmented tabs above replace it, so we omit it entirely.
  const header = aiMode === 'existing' ? null : RIGHT_HEADER_BY_MODE[aiMode];
  const showScopeTabs = usePromptUi && showExistingOption;
  const promptStepDescription = isScratchRuntime
    ? 'Pick a starter or describe what your agent should do — we generate the name, identifier, and system prompt. Wire up your own tools, MCPs, and integrations in code.'
    : 'Pick a starter or describe what your agent should do — we configure the tools, MCPs, skills, and system prompt for you.';
  const promptStepTitle = scope === 'existing' ? 'Connect your existing agent' : 'Start from a template';
  const promptStepDescriptionResolved =
    scope === 'existing'
      ? 'Paste the Claude Agent ID and Environment ID of an existing managed agent and Novu will route conversations to it.'
      : promptStepDescription;

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
        title={usePromptUi ? promptStepTitle : 'Start from a template'}
        description={
          usePromptUi
            ? promptStepDescriptionResolved
            : 'Create an agent and deploy it to Anthropic from the starter templates. You can also bring in existing agents later.'
        }
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
            {usePromptUi && aiGeneration ? (
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
            ) : (
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
            )}
          </div>
        }
        extraContent={
          <div className="flex flex-col gap-5">
            {usePromptUi && aiGeneration && aiMode === 'prompt' ? (
              <AgentSuggestionPills
                suggestions={aiGeneration.suggestions}
                onSelect={aiGeneration.onSelectSuggestion}
                disabled={disabled}
              />
            ) : !usePromptUi && isExistingMode ? (
              <ExistingAgentFields
                externalAgentId={externalAgentId}
                externalEnvironmentId={externalEnvironmentId}
                errors={errors}
                disabled={disabled}
                onExternalAgentIdChange={onExternalAgentIdChange}
                onExternalEnvironmentIdChange={onExternalEnvironmentIdChange}
              />
            ) : !usePromptUi && isScratchMode ? (
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
            ) : null}
          </div>
        }
      />
    </>
  );
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
