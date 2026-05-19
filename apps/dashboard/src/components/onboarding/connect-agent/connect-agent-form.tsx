import type { ReactNode } from 'react';
import { RiInformation2Line } from 'react-icons/ri';
import {
  ClaudeCredentialsFields,
  type CreateAgentFormErrors,
  ExistingAgentFields,
  ScratchAgentFields,
} from '@/components/agents/create-agent-fields';
import { SetupStep } from '@/components/agents/setup-guide-primitives';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ConnectorDropdown } from './connector-dropdown';
import type { ConnectorId } from './connector-options';
import { TemplateDropdown, type TemplateSelection } from './template-dropdown';

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
};

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
}: ConnectAgentFormProps) {
  return (
    <>
      <SetupStep
        index={1}
        status="completed"
        sectionLabel="1/7 SETUP AGENT BRAIN"
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
            <ConnectorDropdown selectedId={connectorId} onSelect={onConnectorChange} disabled={disabled} />
            {isClaudeSelected && (
              <p className="text-text-soft text-label-xs font-normal leading-4 flex items-center gap-1">
                <RiInformation2Line className="size-3.5" aria-hidden /> Novu hosts the loop on Anthropic Managed Agents.
              </p>
            )}
          </div>
        }
        extraContent={
          isClaudeSelected && (
            <ClaudeCredentialsFields
              apiKey={apiKey}
              workspaceId={externalWorkspaceId}
              errors={errors}
              disabled={disabled}
              onApiKeyChange={onApiKeyChange}
              onWorkspaceIdChange={onExternalWorkspaceIdChange}
            />
          )
        }
      />

      <SetupStep
        index={2}
        status="completed"
        title="Start from a template"
        description="Create an agent and deploy it to Anthropic from the starter templates. You can also bring in existing agents later."
        rightContent={
          <div className="flex w-full flex-col gap-2.5">
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
          </div>
        }
        extraContent={
          <div className="flex flex-col gap-5">
            {isExistingMode ? (
              <ExistingAgentFields
                externalAgentId={externalAgentId}
                externalEnvironmentId={externalEnvironmentId}
                errors={errors}
                disabled={disabled}
                onExternalAgentIdChange={onExternalAgentIdChange}
                onExternalEnvironmentIdChange={onExternalEnvironmentIdChange}
              />
            ) : isScratchMode ? (
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
