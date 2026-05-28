import { Injectable } from '@nestjs/common';
import type { PendingToolApproval } from '@novu/application-generic';
import { type IAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { ConversationRepository } from '@novu/dal';
import {
  type ActionRequired,
  CredentialExpiredError,
  McpServerError,
  type SessionEventContext,
  SessionExpiredError,
  type StreamCallbacks,
  type Response as ThalamusResponse,
} from '@novu/thalamus';
import { HandleAgentReplyCommand } from '../usecases/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../usecases/handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand } from '../usecases/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../usecases/handle-plan-progress/handle-plan-progress.usecase';
import { captureAgentException, captureAgentWarning } from '../utils/capture-agent-sentry';
import { DemoClaudeQuotaPolicy } from './demo-claude-quota-policy.service';
import { ManagedAgentProviderFactory } from './managed-agent-provider-factory';

export const TOOL_APPROVAL_ACTION_PREFIX = 'mcp-approval' as const;

interface BaseCommandFields {
  userId: string;
  environmentId: string;
  organizationId: string;
  conversationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
}

@Injectable()
export class ManagedAgentEventHandler {
  constructor(
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly conversationRepository: ConversationRepository,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly demoQuota: DemoClaudeQuotaPolicy,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  createHandlers(context: SessionEventContext): StreamCallbacks {
    const { sessionId, turnId, metadata } = context;

    if (!metadata.conversationId || !metadata.environmentId || !metadata.organizationId) {
      this.logger.error(`Webhook event missing required metadata: session=${sessionId}`);

      return {};
    }

    const baseFields = this.buildBaseFields(metadata);
    return {
      onToolUseStart: async (event: {
        toolUseId: string;
        toolName: string;
        source?: { type: string; serverName?: string };
      }) => {
        try {
          await this.handlePlanProgress.execute(
            HandlePlanProgressCommand.create({
              ...baseFields,
              toolProgress: {
                turnId,
                action: 'tool-use',
                toolUseId: event.toolUseId,
                toolName: event.toolName,
                mcpServerName: event.source?.type === 'mcp' ? event.source.serverName : undefined,
                status: 'running',
              },
            })
          );
        } catch (err) {
          this.logger.error(err, `onToolUseStart failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-tool-use-start',
            sessionId,
          });
        }
      },

      onToolUseDone: async (event: {
        toolUseId: string;
        toolName: string;
        input?: Record<string, unknown>;
        source?: { type: string; serverName?: string };
      }) => {
        try {
          if (!event.input || Object.keys(event.input).length === 0) {
            return;
          }
          await this.handlePlanProgress.execute(
            HandlePlanProgressCommand.create({
              ...baseFields,
              toolProgress: {
                turnId,
                action: 'tool-use',
                toolUseId: event.toolUseId,
                toolName: event.toolName,
                mcpServerName: event.source?.type === 'mcp' ? event.source.serverName : undefined,
                status: 'running',
                toolInput: event.input,
              },
            })
          );
        } catch (err) {
          this.logger.error(err, `onToolUseDone failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-tool-use-done',
            sessionId,
          });
        }
      },

      onToolUseResult: async (event: { toolUseId: string; isError?: boolean }) => {
        try {
          await this.handlePlanProgress.execute(
            HandlePlanProgressCommand.create({
              ...baseFields,
              toolProgress: {
                turnId,
                action: 'tool-use',
                toolUseId: event.toolUseId,
                status: event.isError === true ? 'error' : 'complete',
              },
            })
          );
        } catch (err) {
          this.logger.error(err, `onToolUseResult failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-tool-use-result',
            sessionId,
          });
        }
      },

      onFinish: async (event: { response: ThalamusResponse }) => {
        try {
          if (event.response.finishReason === 'requires-action') {
            const runtimeProvider = await this.tryGetRuntimeProvider(metadata);
            if (runtimeProvider) {
              const delivered = await this.tryDeliverToolApprovalCard(
                metadata,
                sessionId,
                turnId,
                runtimeProvider,
                event.response
              );

              if (delivered) {
                await this.handlePlanProgress.execute(
                  HandlePlanProgressCommand.create({
                    ...baseFields,
                    toolProgress: { turnId, action: 'awaiting-approval' },
                  })
                );
              }
            }

            return;
          }

          await this.handleAgentReply.execute(
            HandleAgentReplyCommand.create({ ...baseFields, reply: { markdown: event.response.content } })
          );
          await this.demoQuota.recordUsage(
            metadata.environmentId,
            metadata.organizationId,
            metadata.conversationId,
            event.response.usage
          );
          await this.handlePlanProgress.execute(
            HandlePlanProgressCommand.create({ ...baseFields, toolProgress: { turnId, action: 'complete' } })
          );
        } catch (err) {
          this.logger.error(err, `onFinish failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-finish',
            sessionId,
          });
          throw err;
        }
      },

      onError: async (event: { error: Error }) => {
        try {
          await this.handleErrorEvent(metadata, sessionId, event.error, baseFields, turnId);
        } catch (err) {
          this.logger.error(err, `onError handler failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-error-handler',
            sessionId,
          });
        }
      },
    };
  }

  private buildBaseFields(metadata: Record<string, string>): BaseCommandFields {
    return {
      userId: 'system',
      environmentId: metadata.environmentId,
      organizationId: metadata.organizationId,
      conversationId: metadata.conversationId,
      agentIdentifier: metadata.agentIdentifier ?? '',
      integrationIdentifier: metadata.integrationIdentifier ?? '',
    };
  }

  private async handleErrorEvent(
    metadata: Record<string, string>,
    sessionId: string,
    error: Error,
    baseCommand: BaseCommandFields,
    turnId: string
  ): Promise<void> {
    if (error instanceof SessionExpiredError) {
      this.logger.warn(`Session ${sessionId} expired, clearing for next message`);
      await this.conversationRepository.clearExternalSessionId(metadata.environmentId, metadata.conversationId);

      return;
    }

    const message = buildErrorMessage(error);

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({ ...baseCommand, reply: { markdown: message } })
      );
      await this.handlePlanProgress.execute(
        HandlePlanProgressCommand.create({ ...baseCommand, toolProgress: { turnId, action: 'fail' } })
      );
    } catch (err) {
      this.logger.error(err, `Failed to deliver error message for session ${sessionId}`);
      captureAgentException(err, {
        component: 'managed-agent-event-handler',
        operation: 'deliver-error-message',
        sessionId,
      });
    }
  }

  /**
   * Deliver an approval card for the pending tools. Reads `actionsRequired`
   * directly from the finish response (fast path). Falls back to querying
   * the Anthropic session event log when the response lacks tool details
   * (e.g. after a partial confirmation triggers a new observation).
   */
  private async tryDeliverToolApprovalCard(
    metadata: Record<string, string>,
    sessionId: string,
    turnId: string,
    runtimeProvider: IAgentRuntimeProvider,
    response?: ThalamusResponse
  ): Promise<boolean> {
    let pendingTools: PendingToolApproval[] = response ? extractPendingToolApprovals(response) : [];

    if (pendingTools.length === 0) {
      try {
        pendingTools = await runtimeProvider.getAllPendingToolApprovals(sessionId);
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err), sessionId },
          'getAllPendingToolApprovals failed; cannot render Approve/Deny card'
        );
        captureAgentWarning(err, {
          component: 'managed-agent-event-handler',
          operation: 'get-all-pending-tool-approvals',
          sessionId,
        });

        return false;
      }
    }

    if (pendingTools.length === 0) {
      this.logger.warn(
        { sessionId, conversationId: metadata.conversationId },
        'Session is parked on requires-action but no pending tool approvals were located'
      );

      return false;
    }

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          organizationId: metadata.organizationId,
          environmentId: metadata.environmentId,
          conversationId: metadata.conversationId,
          agentIdentifier: metadata.agentIdentifier ?? '',
          integrationIdentifier: metadata.integrationIdentifier ?? '',
          reply: { card: buildToolApprovalCard(pendingTools, turnId) },
        })
      );
    } catch (err) {
      this.logger.error(err, `Failed to deliver tool-approval card for session ${sessionId}`);
      captureAgentException(err, {
        component: 'managed-agent-event-handler',
        operation: 'deliver-tool-approval-card',
        sessionId,
      });

      return false;
    }

    return true;
  }

  private async tryGetRuntimeProvider(metadata: Record<string, string>): Promise<IAgentRuntimeProvider | null> {
    if (!metadata.environmentId || !metadata.agentIdentifier) {
      return null;
    }

    return this.providerFactory.tryGetByAgentIdentifier(metadata.agentIdentifier, metadata.environmentId);
  }
}

export function parseToolApprovalActionId(
  id: string | undefined
): { approved: boolean; toolUseIds: string[]; turnId: string } | null {
  if (!id) return null;
  const parts = id.split(':');
  if (parts.length !== 4 || parts[0] !== TOOL_APPROVAL_ACTION_PREFIX) return null;

  const verdict = parts[1];
  const toolUseIdsPart = parts[2];
  const turnId = parts[3];
  if ((verdict !== 'approve' && verdict !== 'deny') || !toolUseIdsPart || !turnId) return null;

  const toolUseIds = toolUseIdsPart.split(',').filter(Boolean);
  if (toolUseIds.length === 0) return null;

  return { approved: verdict === 'approve', toolUseIds, turnId };
}

function extractPendingToolApprovals(response: ThalamusResponse): PendingToolApproval[] {
  const actions = response.actionsRequired;
  if (!Array.isArray(actions) || actions.length === 0) {
    return [];
  }

  return actions.map((action: ActionRequired) => ({
    toolUseId: action.toolUseId,
    toolName: action.toolName,
    mcpServerName: action.type === 'mcp-approval' ? action.serverName : undefined,
    input: action.input,
  }));
}

export function isLinkButtonActionId(id: string | undefined): boolean {
  return typeof id === 'string' && id.startsWith('link-');
}

function formatToolLabel(t: PendingToolApproval): string {
  const name = t.mcpServerName ? `${t.toolName} from ${t.mcpServerName}` : t.toolName;
  const input = t.input ? `: ${summariseInput(t.input)}` : '';

  return `${name}${input}`;
}

function buildToolApprovalCard(pendingTools: PendingToolApproval[], turnId: string): Record<string, unknown> {
  const tool = pendingTools[0];
  const serverLabel = tool.mcpServerName ? ` from ${tool.mcpServerName}` : '';
  const toolLabel = formatToolLabel(tool);

  const inputSummary = tool.input ? summariseInput(tool.input) : '';
  const description = inputSummary
    ? `I'd like to call \`${tool.toolName}\`${serverLabel}:\n\`\`\`\n${inputSummary}\n\`\`\``
    : `I'd like to call \`${tool.toolName}\`${serverLabel}.`;

  const children: Record<string, unknown>[] = [{ type: 'text', content: description }];

  children.push(
    { type: 'divider' },
    {
      type: 'actions',
      children: [
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:approve:${tool.toolUseId}:${turnId}`,
          label: 'Approve',
          style: 'primary',
          value: toolLabel,
        },
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:deny:${tool.toolUseId}:${turnId}`,
          label: 'Deny',
          style: 'danger',
          value: toolLabel,
        },
      ],
    }
  );

  if (pendingTools.length > 1) {
    const allIds = pendingTools.map((t) => t.toolUseId).join(',');
    const allLabels = pendingTools.map((t) => formatToolLabel(t)).join('\n');
    children.push({
      type: 'actions',
      children: [
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:approve:${allIds}:${turnId}`,
          label: `Approve All (${pendingTools.length})`,
          style: 'primary',
          value: allLabels,
        },
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:deny:${allIds}:${turnId}`,
          label: `Deny All (${pendingTools.length})`,
          style: 'danger',
          value: allLabels,
        },
      ],
    });
  }

  return {
    type: 'card',
    title: 'Tool Approval',
    children,
  };
}

export function buildToolApprovalVerdictCard(
  approved: boolean,
  toolCount: number,
  toolDescription?: string
): Record<string, unknown> {
  const emoji = approved ? '✅' : '🚫';
  const verb = approved ? 'Approved' : 'Denied';
  const suffix = toolCount > 1 ? ` all ${toolCount} tools` : '';
  const subtitle = toolDescription || undefined;

  return {
    type: 'card',
    title: 'Tool Approval',
    subtitle,
    children: [{ type: 'text', content: `${emoji}  ${verb}${suffix}` }],
  };
}

function summariseInput(input: Record<string, unknown>): string {
  const firstValue = Object.values(input)[0];
  if (firstValue === undefined) return '';
  const text = typeof firstValue === 'string' ? firstValue : JSON.stringify(firstValue);

  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function buildErrorMessage(err: unknown): string {
  if (err instanceof CredentialExpiredError) {
    return `Agent error: Credentials for "${err.serverName}" have expired. Please update them in your integration settings.`;
  }
  if (err instanceof McpServerError) {
    return `Agent error: MCP server "${err.serverName}" is unavailable (${err.statusCode ?? 'unknown status'}).`;
  }

  if (err instanceof Error) {
    const mcpInitMatch = err.message.match(/MCP server ['"]([^'"]+)['"] initialize failed/i);
    if (mcpInitMatch) {
      const serverName = mcpInitMatch[1];

      return (
        `I couldn't connect to the **${serverName}** MCP server yet. ` +
        `If this thread shows a setup card, use Connect to authorize ${serverName}, then send your message again.`
      );
    }
  }

  return 'The agent is temporarily unavailable. Please try again later.';
}
