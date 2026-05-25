import type { RuntimeType } from '@/components/agents/create-agent-fields';
import { isDemoManagedClaudeIntegrationSelected } from '@/components/agents/connectors/claude-managed-integrations';
import { ClaudeIcon } from '@/components/icons/claude';
import type { IIntegration } from '@novu/shared';
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
  const isDemoProviderSelected = isDemoManagedClaudeIntegrationSelected(
    integrations,
    summary.selectedIntegrationId
  );
  const isExistingMode =
    isClaudeSelected && !isDemoProviderSelected && summary.templateSelection.kind === 'existing';
  const isScratchMode = summary.templateSelection.kind === 'scratch';
  const showExistingOption = isClaudeSelected && !isDemoProviderSelected;
  const existingOptionIcon = isClaudeSelected ? (
    <div className="bg-primary-base/10 text-primary-base flex size-4 items-center justify-center rounded-full">
      <ClaudeIcon className="size-3" />
    </div>
  ) : undefined;

  return { isClaudeSelected, isExistingMode, isScratchMode, showExistingOption, existingOptionIcon };
}
