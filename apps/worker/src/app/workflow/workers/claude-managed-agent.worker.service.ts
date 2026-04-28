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
}
