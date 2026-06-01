import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationRepository } from '@novu/dal';
import {
  CredentialExpiredError,
  McpServerError,
  type SessionEventContext,
  SessionExpiredError,
  type StreamCallbacks,
  type Response as ThalamusResponse,
} from '@novu/thalamus';
import { HandleAgentReplyCommand } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { captureAgentException } from '../shared/errors/capture-agent-sentry';
import { DemoClaudeQuotaPolicy } from './demo-claude-quota-policy.service';
import { HandlePendingToolApprovalsCommand } from './tool-approval/handle-pending-tool-approvals.command';
import { HandlePendingToolApprovals } from './tool-approval/handle-pending-tool-approvals.usecase';

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
    private readonly conversationRepository: ConversationRepository,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly handlePendingToolApprovals: HandlePendingToolApprovals,
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
            await this.handlePendingToolApprovals.execute(
              HandlePendingToolApprovalsCommand.create({
                ...baseFields,
                subscriberId: metadata.subscriberId,
                platform: metadata.platform,
                sessionId,
                turnId,
                response: event.response,
              })
            );

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
}

function extractErrorMessage(err: unknown): string | undefined {
  if (err instanceof Error) {
    return err.message;
  }

  // Errors that cross the webhook boundary are JSON-serialized and arrive as
  // plain objects, so `instanceof Error` is false — read `message` directly.
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;

    return typeof message === 'string' ? message : undefined;
  }

  return undefined;
}

export function buildErrorMessage(err: unknown): string {
  if (err instanceof CredentialExpiredError) {
    return `Agent error: Credentials for "${err.serverName}" have expired. Please update them in your integration settings.`;
  }
  if (err instanceof McpServerError) {
    return `Agent error: MCP server "${err.serverName}" is unavailable (${err.statusCode ?? 'unknown status'}).`;
  }

  const message = extractErrorMessage(err);
  if (message) {
    const mcpInitMatch = message.match(/MCP server ['"]([^'"]+)['"] initialize failed/i);
    if (mcpInitMatch) {
      return buildMcpInitFailureMessage(mcpInitMatch[1]);
    }
  }

  return 'The agent is temporarily unavailable. Please try again later.';
}

export function buildMcpInitFailureMessage(serverName: string): string {
  return (
    `I couldn't connect to the **${serverName}** MCP server yet. ` +
    `If this thread shows a setup card, use Connect to authorize ${serverName}, then send your message again.`
  );
}
