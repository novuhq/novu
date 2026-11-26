import type { AgentApprovalPart } from '@novu/js';
import { normalizeToolName } from './copilot-web-chat-utils';

type ApprovalChange = Pick<AgentApprovalPart, 'toolName' | 'input'>;

/** What the dashboard knows of the integration a change targets; the Copilot only passes its id. */
export type CopilotApprovalIntegration = { name?: string; environmentName?: string };

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function describeSubject(integration?: CopilotApprovalIntegration): string {
  if (!integration?.name) return 'this integration';

  return integration.environmentName
    ? `"${integration.name}" in ${integration.environmentName}`
    : `"${integration.name}"`;
}

function describeUpdate(input: Record<string, unknown>, subject: string): string {
  const changes: string[] = [];
  if (isNonEmptyString(input.name)) changes.push(`rename it to "${input.name}"`);
  if (isNonEmptyString(input.identifier)) changes.push(`change its identifier to "${input.identifier}"`);
  if (typeof input.active === 'boolean') changes.push(input.active ? 'turn it on' : 'turn it off');

  return changes.length > 0 ? `Update ${subject}: ${changes.join(', ')}` : `Update ${subject}`;
}

/** The id of the integration a change targets, when it targets one. */
export function getApprovalIntegrationId({ input }: Pick<ApprovalChange, 'input'>): string | undefined {
  return isNonEmptyString(input?.integrationId) ? input.integrationId : undefined;
}

/** What a change waiting for approval will do, in one line, from the arguments the Copilot chose. */
export function describeCopilotChange(
  { toolName, input = {} }: ApprovalChange,
  integration?: CopilotApprovalIntegration
): string {
  const subject = describeSubject(integration);

  switch (normalizeToolName(toolName)) {
    case 'set_activity_tracking':
      return `Turn ${input.enabled === false ? 'off' : 'on'} activity tracking for ${subject}`;
    case 'set_primary_integration':
      return `Make ${subject} the primary integration of its channel`;
    case 'update_integration':
      return describeUpdate(input, subject);
    default:
      return `Run ${normalizeToolName(toolName).replace(/_/g, ' ')}`;
  }
}
