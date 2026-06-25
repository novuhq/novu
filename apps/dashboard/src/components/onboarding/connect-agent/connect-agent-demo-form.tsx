import { AgentRuntimeProviderIdEnum, type IIntegration } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { RiCloseLine, RiInformation2Line, RiLoopLeftLine } from 'react-icons/ri';
import { isDemoManagedClaudeIntegrationSelected } from '@/components/agents/connectors/claude-managed-integrations';
import {
  ConnectorIntegrationDropdown,
  type ConnectorIntegrationStatus,
} from '@/components/agents/connectors/connector-integration-dropdown';
import { type ConnectorOption, getConnectorById } from '@/components/agents/connectors/connector-options';
import {
  ConfigureCredentialsSection,
  type CreateAgentFormErrors,
  ScratchAgentFields,
  type VerifyStatus,
} from '@/components/agents/create-agent-fields';
import { SetupStep } from '@/components/agents/setup-guide-primitives';
import { Button } from '@/components/primitives/button';
import { AgentSuggestionPills } from './agent-suggestion-pills';
import type { AgentGenerationBindings } from './connect-agent-form';
import type { ConnectorId } from './connector-options';
import { GenerationStatus } from './generation-status';
import { PromptInput } from './prompt-input';

export type ConnectAgentDemoFormProps = {
  connectorId?: ConnectorId;
  isClaudeSelected: boolean;
  isScratchRuntime: boolean;
  apiKey: string;
  externalWorkspaceId: string;
  region: string;
  name: string;
  identifier: string;
  instructions: string;
  isIdentifierTouched: boolean;
  errors: CreateAgentFormErrors;
  disabled?: boolean;
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
  onApiKeyChange: (next: string) => void;
  onExternalWorkspaceIdChange: (next: string) => void;
  onRegionChange: (next: string) => void;
  onNameChange: (next: string) => void;
  onIdentifierChange: (next: string) => void;
  onIdentifierTouched: () => void;
  onInstructionsChange: (next: string) => void;
  onSelectIntegration: (integration: IIntegration) => void;
  onRequestSetupCredentials: (option: ConnectorOption) => void;
  onCredentialsExpandedChange: (expanded: boolean) => void;
  onIntegrationNameChange: (next: string) => void;
  onVerify: () => void;
  onSaveIntegration: () => void;
  aiGeneration?: AgentGenerationBindings;
  submitSlot?: ReactNode;
};

export function ConnectAgentDemoForm({
  connectorId,
  isClaudeSelected,
  isScratchRuntime,
  apiKey,
  externalWorkspaceId,
  region,
  name,
  identifier,
  instructions,
  isIdentifierTouched,
  errors,
  disabled,
  integrations,
  selectedIntegrationId,
  dropdownStatus,
  showSavedBadge,
  credentialsPanelVisible,
  credentialsPanelExpanded,
  integrationName,
  verifyStatus,
  verifyMessage,
  isSavingIntegration,
  onConnectorChange,
  onApiKeyChange,
  onExternalWorkspaceIdChange,
  onRegionChange,
  onNameChange,
  onIdentifierChange,
  onIdentifierTouched,
  onInstructionsChange,
  onSelectIntegration,
  onRequestSetupCredentials,
  onCredentialsExpandedChange,
  onIntegrationNameChange,
  onVerify,
  onSaveIntegration,
  aiGeneration,
  submitSlot,
}: ConnectAgentDemoFormProps) {
  const demoSelectedConnector = getConnectorById(connectorId);
  const showDemoCredentialsSection =
    isClaudeSelected && credentialsPanelVisible && Boolean(demoSelectedConnector?.providerId);
  const isDemoCredentialSelected = isDemoManagedClaudeIntegrationSelected(integrations, selectedIntegrationId);
  const isConnectorStepCompleted = isScratchRuntime || Boolean(selectedIntegrationId);

  const demoConnectorStep = (
    <SetupStep
      index={1}
      status={isConnectorStepCompleted ? 'completed' : 'current'}
      sectionLabel="2/7 CONNECT AGENT"
      title="Where your agent runs?"
      description="The platform or framework that hosts and runs your agent today. Novu supports both custom-code and managed-runtime agents."
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
            <RiInformation2Line className="size-3.5" aria-hidden />
            Don't have an agent yet? You can use Demo credentials to connect a demo agent.
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

  if (!isConnectorStepCompleted) {
    return demoConnectorStep;
  }

  if (isScratchRuntime || !aiGeneration) {
    return (
      <>
        {demoConnectorStep}
        <SetupStep
          index={2}
          status="current"
          title="Configure your agent"
          description="Tell us more about your agent, and next we'll connect it to the first channel."
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
          <div className="mt-5 flex max-w-[500px] flex-col gap-3">
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
