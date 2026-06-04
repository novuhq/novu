import type { IIntegration } from '@novu/shared';
import { isDemoManagedClaudeIntegrationSelected } from '@/components/agents/connectors/claude-managed-integrations';
import type { RuntimeType } from '@/components/agents/create-agent-fields';
import { ClaudeIcon } from '@/components/icons/claude';
import { type ConnectorId, getConnectorById } from './connector-options';
import type { TemplateSelection } from './template-dropdown';

/**
 * Snapshot of the connect-phase form values. Used by the details phase to render the
 * "View all instructions" recap (the same form, in disabled mode, pre-filled with the
 * user's choices).
 */
export type ConnectSummary = {
  connectorId: ConnectorId;
  templateSelection: TemplateSelection;
  name: string;
  identifier: string;
  instructions: string;
  apiKey: string;
  externalAgentId: string;
  externalEnvironmentId: string;
  externalWorkspaceId: string;
  region?: string;
  /**
   * Managed-runtime integration the user picked or just created during the connect phase.
   * Used in the recap to render the integration name inside the connector dropdown.
   */
  selectedIntegrationId?: string;
  /**
   * Display name used when the user provisioned a new managed-runtime integration inline.
   */
  integrationName?: string;
  /**
   * MCP server ids the user picked during the connect phase. Populated from the
   * LLM-generated payload when the AI flow is used, or from the chosen template's
   * `suggestedMcpServers`. Used as a pre-creation preview hint and as a fallback when the
   * post-creation API response omits the live runtime view (e.g. provider read failed); the
   * authoritative post-creation source is `agent.managedRuntime.mcpServers`.
   */
  mcpServers?: ReadonlyArray<string>;
  /**
   * Tool ids the user picked during the connect phase (Claude built-in tool `type` strings).
   * Populated from the LLM-generated payload when the AI flow is used. Empty for static
   * templates. Used as a pre-creation preview hint and as a fallback when the post-creation
   * API response omits the live runtime view; the authoritative post-creation source is
   * `agent.managedRuntime.tools`.
   */
  tools?: ReadonlyArray<string>;
};

function resolveRuntime(connectorId: ConnectorId): RuntimeType {
  const runtime = getConnectorById(connectorId)?.runtime;

  return runtime ?? 'scratch';
}

/**
 * Derives the display-only flags that `ConnectAgentForm` needs from a `ConnectSummary`.
 * Keeps the recap rendering in `AgentSetupSteps` in sync with the editable form's logic.
 */
export function deriveConnectSummaryDisplay(summary: ConnectSummary, integrations?: IIntegration[]) {
  const runtime = resolveRuntime(summary.connectorId);
  const isClaudeSelected = runtime === 'claude';
  const isScratchRuntime = runtime === 'scratch';
  const isDemoProviderSelected = isDemoManagedClaudeIntegrationSelected(integrations, summary.selectedIntegrationId);
  const isExistingMode = isClaudeSelected && !isDemoProviderSelected && summary.templateSelection.kind === 'existing';
  const isScratchMode = isScratchRuntime || summary.templateSelection.kind === 'scratch';
  const showExistingOption = isClaudeSelected && !isDemoProviderSelected;
  const existingOptionIcon = isClaudeSelected ? (
    <div className="bg-primary-base/10 text-primary-base flex size-4 items-center justify-center rounded-full">
      <ClaudeIcon className="size-3" />
    </div>
  ) : undefined;

  return {
    isClaudeSelected,
    isScratchRuntime,
    isExistingMode,
    isScratchMode,
    showExistingOption,
    existingOptionIcon,
  };
}
