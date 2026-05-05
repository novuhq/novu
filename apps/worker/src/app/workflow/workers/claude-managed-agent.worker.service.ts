import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import {
  AgentProgressRenderer,
  AgentProgressTask,
  BullMqService,
  decryptEnvironmentVariableValue,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  getClaudeManagedAgentWorkerOptions,
  IClaudeManagedAgentDataDto,
  WorkerBaseService,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { EnvironmentVariableRepository } from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';

const LOG_CONTEXT = 'ClaudeManagedAgentWorker';
const ANTHROPIC_API_KEY_ENV_VAR = 'NOVU_AGENT_ANTHROPIC_API_KEY';
const TERMINAL_ERROR_MARKDOWN = "Sorry, I couldn't finish that. Please try again.";
const MIN_STATUS_INTERVAL_MS = 750;

/**
 * Action ids on the approval card that come back through
 * `chat.onAction` → `AgentEventEnum.ON_ACTION` → `ClaudeManagedRuntime`.
 * Keep these stable; the runtime parses them.
 */
export const MCP_APPROVE_ACTION_ID = 'mcp:allow';
export const MCP_DENY_ACTION_ID = 'mcp:deny';
const MAX_TOOL_INPUT_PREVIEW_CHARS = 1500;

type AgentStatusState = 'thinking' | 'tool_use' | 'tool_result' | 'compacting' | 'retrying' | 'error' | 'typing';

type StatusPayload = {
  state: AgentStatusState;
  toolName?: string;
};

type StatusResponse = {
  success: boolean;
  messageId?: string;
  platformThreadId?: string;
  progressRenderer?: AgentProgressRenderer;
};

type PendingApproval = {
  toolName: string;
  input: Record<string, unknown>;
  mcpServerName?: string;
};

@Injectable()
export class ClaudeManagedAgentWorker extends WorkerBaseService {
  constructor(
    private readonly environmentVariableRepository: EnvironmentVariableRepository,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(JobTopicNameEnum.CLAUDE_MANAGED_AGENT, new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return getClaudeManagedAgentWorkerOptions();
  }

  private getWorkerProcessor() {
    return async ({ data }: { data: IClaudeManagedAgentDataDto }) => {
      const apiKey = await this.getAnthropicApiKey(data.organizationId, data.environmentId);
      const secretKey = await this.getSecretKey(data);
      const client = new Anthropic({ apiKey });
      const stream = await client.beta.sessions.events.stream(data.sessionId);
      const chunks: string[] = [];
      let placeholderMessageId = data.placeholderMessageId;
      let placeholderPlatformThreadId = data.placeholderPlatformThreadId;
      let progressRenderer = data.progressRenderer;
      const progressTasks: AgentProgressTask[] = data.progressTasks?.length
        ? [...data.progressTasks]
        : [{ id: 'thinking', title: 'Understanding the request', status: 'in_progress' }];
      let lastStatusAt = 0;
      let statusTimer: ReturnType<typeof setTimeout> | null = null;
      let pendingStatus: StatusPayload | null = null;
      let isFinalizing = false;
      const inFlightStatusUpdates = new Set<Promise<void>>();
      // Keyed by tool_use event id; populated when a tool emits `evaluated_permission: 'ask'`.
      // Drained on `session.status_idle` with `stop_reason.type === 'requires_action'`.
      const pendingApprovals = new Map<string, PendingApproval>();

      const sendStatus = async (payload: StatusPayload): Promise<void> => {
        if (!data.interimEditsSupported || isFinalizing) {
          return;
        }

        try {
          const response = await this.postStatus(data, secretKey, {
            ...payload,
            messageId: placeholderMessageId,
            platformThreadId: placeholderPlatformThreadId,
            progressRenderer,
            progressTasks,
          });
          placeholderMessageId = response.messageId ?? placeholderMessageId;
          placeholderPlatformThreadId = response.platformThreadId ?? placeholderPlatformThreadId;
          progressRenderer = response.progressRenderer ?? progressRenderer;
        } catch (err) {
          Logger.warn(
            {
              err: err instanceof Error ? err.message : String(err),
              sessionId: data.sessionId,
              state: payload.state,
            },
            'Claude managed status update failed',
            LOG_CONTEXT
          );
        }
      };

      const trackStatus = (promise: Promise<void>): Promise<void> => {
        inFlightStatusUpdates.add(promise);

        return promise.finally(() => {
          inFlightStatusUpdates.delete(promise);
        });
      };

      const scheduleStatus = async (payload: StatusPayload): Promise<void> => {
        if (!data.interimEditsSupported || isFinalizing) {
          return;
        }

        const elapsed = Date.now() - lastStatusAt;
        if (elapsed >= MIN_STATUS_INTERVAL_MS) {
          lastStatusAt = Date.now();
          await trackStatus(sendStatus(payload));

          return;
        }

        pendingStatus = payload;
        if (statusTimer) {
          return;
        }

        statusTimer = setTimeout(() => {
          statusTimer = null;
          const next = pendingStatus;
          pendingStatus = null;

          if (!next) {
            return;
          }

          lastStatusAt = Date.now();
          trackStatus(sendStatus(next)).catch((err) => {
            Logger.warn(
              { err: err instanceof Error ? err.message : String(err), sessionId: data.sessionId },
              'Claude managed delayed status update failed',
              LOG_CONTEXT
            );
          });
        }, MIN_STATUS_INTERVAL_MS - elapsed);
      };

      const stopStatusUpdates = async (): Promise<void> => {
        isFinalizing = true;
        pendingStatus = null;

        if (statusTimer) {
          clearTimeout(statusTimer);
          statusTimer = null;
        }

        await Promise.allSettled([...inFlightStatusUpdates]);
      };

      try {
        await scheduleStatus({ state: 'thinking' });

        for await (const event of stream) {
          if (event.type === 'agent.message') {
            for (const block of event.content) {
              const text = 'text' in block ? block.text : undefined;
              if (text) {
                chunks.push(text);
              }
            }
          }

          if (event.type === 'session.status_running' || event.type === 'agent.thinking') {
            this.ensureProgressTask(progressTasks, 'thinking', 'Understanding the request', 'in_progress');
            await scheduleStatus({ state: 'thinking' });
          }

          if (event.type === 'agent.tool_use') {
            Logger.verbose(
              { name: event.name, sessionId: data.sessionId },
              'Claude managed agent used tool',
              LOG_CONTEXT
            );
            this.completeProgressTask(progressTasks, 'thinking', 'Request understood');
            this.ensureProgressTask(progressTasks, `tool:${event.id}`, `Using tool: ${event.name}`, 'in_progress');
            if (event.evaluated_permission === 'ask') {
              pendingApprovals.set(event.id, { toolName: event.name, input: event.input ?? {} });
            }
            await scheduleStatus({ state: 'tool_use', toolName: event.name });
          }

          if (event.type === 'agent.mcp_tool_use') {
            const toolName = `${event.mcp_server_name}.${event.name}`;
            Logger.verbose(
              { name: toolName, sessionId: data.sessionId },
              'Claude managed agent used MCP tool',
              LOG_CONTEXT
            );
            this.completeProgressTask(progressTasks, 'thinking', 'Request understood');
            this.ensureProgressTask(progressTasks, `tool:${event.id}`, `Using tool: ${toolName}`, 'in_progress');
            if (event.evaluated_permission === 'ask') {
              pendingApprovals.set(event.id, {
                toolName,
                input: event.input ?? {},
                mcpServerName: event.mcp_server_name,
              });
            }
            await scheduleStatus({ state: 'tool_use', toolName });
          }

          if (event.type === 'agent.tool_result') {
            this.completeProgressTask(
              progressTasks,
              `tool:${event.tool_use_id}`,
              event.is_error ? 'Tool failed' : 'Tool result received',
              event.is_error ? 'error' : 'complete'
            );
            await scheduleStatus({ state: 'tool_result' });
          }

          if (event.type === 'agent.mcp_tool_result') {
            this.completeProgressTask(
              progressTasks,
              `tool:${event.mcp_tool_use_id}`,
              event.is_error ? 'Tool failed' : 'Tool result received',
              event.is_error ? 'error' : 'complete'
            );
            await scheduleStatus({ state: 'tool_result' });
          }

          if (event.type === 'agent.thread_context_compacted') {
            this.ensureProgressTask(progressTasks, 'compacting', 'Optimized context', 'complete');
            await scheduleStatus({ state: 'compacting' });
          }

          if (event.type === 'session.status_rescheduled') {
            this.ensureProgressTask(progressTasks, 'retrying', 'Anthropic retrying', 'in_progress');
            await scheduleStatus({ state: 'retrying' });
          }

          if (event.type === 'session.error') {
            // MCP authentication failure → DM the subscriber a signed connect link so
            // they can OAuth into the missing service. Anthropic auto-retries on the
            // next status_idle → status_running transition once we store the
            // credential, so we don't need to do anything else here.
            if ('error' in event && (event.error as { type?: string }).type === 'mcp_authentication_failed_error') {
              const mcpServerName = (event.error as { mcp_server_name?: string }).mcp_server_name;
              if (mcpServerName) {
                await this.postMcpConnectPrompt(data, secretKey, mcpServerName).catch((err) =>
                  Logger.warn(
                    { err: err instanceof Error ? err.message : String(err), sessionId: data.sessionId },
                    'Failed to post MCP connect prompt',
                    LOG_CONTEXT
                  )
                );
              }
            }

            this.ensureProgressTask(progressTasks, 'retrying', 'Anthropic retrying', 'in_progress');
            await scheduleStatus({ state: 'retrying' });
          }

          if (event.type === 'session.status_terminated') {
            this.markActiveTasks(progressTasks, 'error');
            await scheduleStatus({ state: 'error' });
            await stopStatusUpdates();
            await this.postReply(
              data,
              secretKey,
              TERMINAL_ERROR_MARKDOWN,
              placeholderMessageId,
              placeholderPlatformThreadId
            );

            return;
          }

          if (event.type === 'session.status_idle') {
            if (event.stop_reason?.type === 'requires_action') {
              await this.handleRequiresAction({
                data,
                secretKey,
                stopEventIds: event.stop_reason.event_ids ?? [],
                pendingApprovals,
                progressTasks,
                placeholderMessageId,
                placeholderPlatformThreadId,
                progressRenderer,
                stopStatusUpdates,
              });

              return;
            }
            break;
          }
        }

        const markdown = chunks.join('').trim();
        if (!markdown) {
          Logger.warn(
            { sessionId: data.sessionId },
            'Claude managed agent completed without a text response',
            LOG_CONTEXT
          );

          return;
        }

        await stopStatusUpdates();
        await this.postReply(data, secretKey, markdown, placeholderMessageId, placeholderPlatformThreadId);
      } catch (err) {
        await stopStatusUpdates();
        if (data.interimEditsSupported && placeholderMessageId) {
          await this.postReply(
            data,
            secretKey,
            TERMINAL_ERROR_MARKDOWN,
            placeholderMessageId,
            placeholderPlatformThreadId
          ).catch((replyErr) => {
            Logger.warn(
              {
                err: replyErr instanceof Error ? replyErr.message : String(replyErr),
                sessionId: data.sessionId,
              },
              'Claude managed terminal error reply failed',
              LOG_CONTEXT
            );
          });
        }

        throw err;
      } finally {
        if (statusTimer) {
          clearTimeout(statusTimer);
        }
      }
    };
  }

  private async getAnthropicApiKey(organizationId: string, environmentId: string): Promise<string> {
    const variable = await this.environmentVariableRepository.findOne(
      { _organizationId: organizationId, key: ANTHROPIC_API_KEY_ENV_VAR },
      ['values']
    );
    const value = variable?.values?.find((item) => item._environmentId === environmentId)?.value;

    if (!value) {
      throw new Error('Anthropic API key is not configured for this environment.');
    }

    return decryptEnvironmentVariableValue(value);
  }

  private async getSecretKey(data: IClaudeManagedAgentDataDto): Promise<string> {
    return await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: data.environmentId,
        organizationId: data.organizationId,
      })
    );
  }

  private async postStatus(
    data: IClaudeManagedAgentDataDto,
    secretKey: string,
    payload: StatusPayload & {
      messageId?: string;
      platformThreadId?: string;
      progressRenderer?: AgentProgressRenderer;
      progressTasks?: AgentProgressTask[];
    }
  ): Promise<StatusResponse> {
    const apiRootUrl = process.env.API_ROOT_URL || 'http://localhost:3000';
    const url = `${apiRootUrl}/v1/agents/${encodeURIComponent(data.agentIdentifier)}/status`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: data.conversationId,
        integrationIdentifier: data.integrationIdentifier,
        messageId: payload.messageId,
        platformThreadId: payload.platformThreadId,
        state: payload.state,
        toolName: payload.toolName,
        progressRenderer: payload.progressRenderer,
        progressTasks: payload.progressTasks,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude managed agent status failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.json().catch(() => null);
    const result = (body?.data ?? body) as StatusResponse | null;

    return {
      success: result?.success ?? true,
      messageId: result?.messageId,
      platformThreadId: result?.platformThreadId,
      progressRenderer: result?.progressRenderer,
    };
  }

  private ensureProgressTask(
    tasks: AgentProgressTask[],
    id: string,
    title: string,
    status: AgentProgressTask['status']
  ): AgentProgressTask {
    let task = tasks.find((item) => item.id === id);
    if (!task) {
      task = { id, title, status };
      tasks.push(task);

      return task;
    }

    task.title = title;
    task.status = status;

    return task;
  }

  private completeProgressTask(
    tasks: AgentProgressTask[],
    id: string,
    output: string,
    status: AgentProgressTask['status'] = 'complete'
  ): void {
    const task = tasks.find((item) => item.id === id);
    if (!task) {
      return;
    }

    task.status = status;
    task.output = output;
  }

  private markActiveTasks(tasks: AgentProgressTask[], status: AgentProgressTask['status']): void {
    for (const task of tasks) {
      if (task.status === 'in_progress') {
        task.status = status;
      }
    }
  }

  /**
   * Anthropic emitted `session.status_idle` with `stop_reason.type === 'requires_action'`,
   * meaning the agent paused on one or more tool uses with `evaluated_permission: 'ask'`.
   * For each event the agent is blocked on, post an Approve/Deny card to the conversation.
   * The buttons carry the `tool_use_id` in their `value` so the runtime can dispatch a
   * `user.tool_confirmation` when the user clicks.
   */
  private async handleRequiresAction(args: {
    data: IClaudeManagedAgentDataDto;
    secretKey: string;
    stopEventIds: string[];
    pendingApprovals: Map<string, PendingApproval>;
    progressTasks: AgentProgressTask[];
    placeholderMessageId?: string;
    placeholderPlatformThreadId?: string;
    progressRenderer?: AgentProgressRenderer;
    stopStatusUpdates: () => Promise<void>;
  }): Promise<void> {
    const {
      data,
      secretKey,
      stopEventIds,
      pendingApprovals,
      progressTasks,
      placeholderMessageId,
      placeholderPlatformThreadId,
      progressRenderer,
      stopStatusUpdates,
    } = args;

    for (const eventId of stopEventIds) {
      const approval = pendingApprovals.get(eventId);
      if (!approval) continue;
      this.completeProgressTask(progressTasks, `tool:${eventId}`, 'Awaiting your approval', 'in_progress');
    }

    if (data.interimEditsSupported && placeholderMessageId) {
      try {
        await this.postStatus(data, secretKey, {
          state: 'tool_use',
          messageId: placeholderMessageId,
          platformThreadId: placeholderPlatformThreadId,
          progressRenderer,
          progressTasks,
        });
      } catch (err) {
        Logger.warn(
          { err: err instanceof Error ? err.message : String(err), sessionId: data.sessionId },
          'Failed to flush awaiting-approval status before posting cards',
          LOG_CONTEXT
        );
      }
    }

    await stopStatusUpdates();

    let postedAny = false;
    for (const eventId of stopEventIds) {
      const approval = pendingApprovals.get(eventId);
      if (!approval) {
        Logger.warn(
          { sessionId: data.sessionId, eventId },
          'Session requires action for an event we never observed; ignoring',
          LOG_CONTEXT
        );
        continue;
      }

      try {
        await this.postApprovalCard(data, secretKey, eventId, approval);
        postedAny = true;
      } catch (err) {
        Logger.error(
          { err: err instanceof Error ? err.message : String(err), sessionId: data.sessionId, eventId },
          'Failed to post Claude managed approval card',
          LOG_CONTEXT
        );
      }
    }

    if (!postedAny) {
      Logger.warn(
        { sessionId: data.sessionId, stopEventIds },
        'Session paused for approval but no cards were delivered',
        LOG_CONTEXT
      );
    }
  }

  private async postApprovalCard(
    data: IClaudeManagedAgentDataDto,
    secretKey: string,
    toolUseId: string,
    approval: PendingApproval
  ): Promise<void> {
    const apiRootUrl = process.env.API_ROOT_URL || 'http://localhost:3000';
    const url = `${apiRootUrl}/v1/agents/${encodeURIComponent(data.agentIdentifier)}/reply`;
    const card = buildApprovalCard(toolUseId, approval);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: data.conversationId,
        integrationIdentifier: data.integrationIdentifier,
        reply: { card },
      }),
    });

    if (!response.ok) {
      throw new Error(`Approval card post failed: ${response.status} ${response.statusText}`);
    }
  }

  private async postReply(
    data: IClaudeManagedAgentDataDto,
    secretKey: string,
    markdown: string,
    placeholderMessageId?: string,
    placeholderPlatformThreadId?: string
  ): Promise<void> {
    const apiRootUrl = process.env.API_ROOT_URL || 'http://localhost:3000';
    const url = `${apiRootUrl}/v1/agents/${encodeURIComponent(data.agentIdentifier)}/reply`;
    const payload =
      data.interimEditsSupported && placeholderMessageId
        ? {
            conversationId: data.conversationId,
            integrationIdentifier: data.integrationIdentifier,
            edit: {
              messageId: placeholderMessageId,
              platformThreadId: placeholderPlatformThreadId,
              content: { markdown },
            },
          }
        : {
            conversationId: data.conversationId,
            integrationIdentifier: data.integrationIdentifier,
            reply: { markdown },
          };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Claude managed agent reply failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Asks the API to mint a signed connect link for an MCP server, then DMs that link
   * back to the subscriber via the existing reply pipeline. Anthropic will retry the
   * tool call on the next status_idle → status_running transition once the credential
   * lands in the subscriber's vault.
   */
  private async postMcpConnectPrompt(
    data: IClaudeManagedAgentDataDto,
    secretKey: string,
    mcpServerName: string
  ): Promise<void> {
    if (!data.subscriberId) {
      Logger.warn({ sessionId: data.sessionId }, 'Cannot prompt MCP connect — no subscriberId on the job', LOG_CONTEXT);

      return;
    }

    const apiRootUrl = process.env.API_ROOT_URL || 'http://localhost:3000';
    const linkResponse = await fetch(
      `${apiRootUrl}/v1/agents/${encodeURIComponent(data.agentIdentifier)}/mcp/connect-link`,
      {
        method: 'POST',
        headers: {
          Authorization: `ApiKey ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: data.conversationId,
          subscriberId: data.subscriberId,
          mcpServerName,
        }),
      }
    );

    if (!linkResponse.ok) {
      throw new Error(`MCP connect link issuance failed: ${linkResponse.status} ${linkResponse.statusText}`);
    }

    const body = await linkResponse.json().catch(() => null);
    const url = body?.url ?? body?.data?.url;
    if (!url) {
      throw new Error('MCP connect link response did not include a url.');
    }

    const markdown = `I need access to **${mcpServerName}** to answer that. [Connect now →](${url})`;
    const replyUrl = `${apiRootUrl}/v1/agents/${encodeURIComponent(data.agentIdentifier)}/reply`;
    await fetch(replyUrl, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: data.conversationId,
        integrationIdentifier: data.integrationIdentifier,
        reply: { markdown },
      }),
    });
  }
}

/**
 * Build the JSON `card` body delivered through the Novu chat SDK. Buttons carry the
 * `tool_use_id` in `value`; `ClaudeManagedRuntime.execute` reads `actionId === 'mcp:allow'`
 * (or `'mcp:deny'`) plus `value` to dispatch the corresponding `user.tool_confirmation`.
 */
function buildApprovalCard(toolUseId: string, approval: PendingApproval): Record<string, unknown> {
  const inputPreview = formatToolInputPreview(approval.input);
  const subtitle = approval.mcpServerName
    ? `${approval.mcpServerName} → ${approval.toolName.split('.').slice(-1)[0]}`
    : approval.toolName;

  const children: Record<string, unknown>[] = [
    { type: 'text', content: 'The agent wants to run a tool that requires your approval.' },
  ];

  if (inputPreview) {
    children.push({ type: 'text', content: inputPreview, style: 'muted' });
  }

  children.push({
    type: 'actions',
    children: [
      { type: 'button', id: MCP_APPROVE_ACTION_ID, label: 'Approve', style: 'primary', value: toolUseId },
      { type: 'button', id: MCP_DENY_ACTION_ID, label: 'Deny', style: 'danger', value: toolUseId },
    ],
  });

  return {
    type: 'card',
    title: `Approval needed: ${approval.toolName}`,
    subtitle,
    children,
  };
}

function formatToolInputPreview(input: Record<string, unknown>): string | null {
  const keys = Object.keys(input ?? {});
  if (keys.length === 0) return null;

  let serialized: string;
  try {
    serialized = JSON.stringify(input, null, 2);
  } catch {
    return null;
  }

  if (serialized.length > MAX_TOOL_INPUT_PREVIEW_CHARS) {
    serialized = `${serialized.slice(0, MAX_TOOL_INPUT_PREVIEW_CHARS)}\n…`;
  }

  return ['```json', serialized, '```'].join('\n');
}
