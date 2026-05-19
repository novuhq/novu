import { Injectable } from '@nestjs/common';
import {
  decryptCredentials,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  getAgentRuntimeProvider,
  HttpClientService,
  type IAgentRuntimeProvider,
  type IManagedAgentJobData,
  PinoLogger,
} from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationRepository,
  IntegrationRepository,
} from '@novu/dal';
import { AgentRuntimeProviderIdEnum, MCP_SERVERS } from '@novu/shared';
import {
  CredentialExpiredError,
  McpServerError,
  type Message,
  MessageRole,
  type Provider,
  SessionExpiredError,
  ThalamusError,
  type Response as ThalamusResponse,
  thalamus,
} from '@novu/thalamus';
import { ProcessManagedAgentTurnCommand } from './process-managed-agent-turn.command';

const MAX_TURN_MS = 3 * 60 * 1000;

interface ResolvedRuntime {
  /** Streaming provider used to actually run the turn. */
  provider: Provider;
  /**
   * In-repo `IAgentRuntimeProvider` instance for the same runtime — exposed
   * separately so we can call capability-bound helpers (e.g.
   * `parseMcpInitFailure`) without coupling the worker to thalamus internals.
   */
  runtimeProvider: IAgentRuntimeProvider;
}

/** Card shape sent to `/v1/agents/.../reply` to surface the Connect button. */
type ChatCardReply = {
  type: 'card';
  children: Array<
    | { type: 'text'; content: string }
    | { type: 'divider' }
    | {
        type: 'actions';
        children: Array<{ type: 'link-button'; label: string; url: string; style?: 'primary' | 'secondary' }>;
      }
  >;
};

@Injectable()
export class ProcessManagedAgentTurn {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    private readonly httpClientService: HttpClientService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ProcessManagedAgentTurnCommand): Promise<void> {
    const runtime = await this.resolveRuntime(command);
    const conversation = await this.loadConversation(command);
    const outcome = await this.runTurnOrFallback(runtime, conversation, command);

    if (outcome.sessionId) {
      await this.conversationRepository.setExternalSessionIdIfMissing(
        command.environmentId,
        command.conversationId,
        outcome.sessionId
      );
    }

    await this.deliverReply(command, outcome.reply);
  }

  /**
   * Stream the turn and translate failures into a delivery-ready reply.
   *
   * Three outcomes:
   *   - success → markdown content from the stream.
   *   - MCP-init failure parsed by the runtime provider → attempt the lazy
   *     OAuth path (generate URL, post a Connect card, park the job). On any
   *     step failing we fall back to a markdown "isn't authorized yet" so
   *     the platform "Typing…" indicator still clears.
   *   - anything else → markdown error message (also clears Typing).
   *
   * BullMQ retries: we always RESOLVE this step (no rethrow) when we either
   * posted a card or built a fallback markdown — those are terminal outcomes
   * for this attempt and re-running won't help. Only genuinely retryable
   * stream errors bubble up.
   */
  private async runTurnOrFallback(
    runtime: ResolvedRuntime,
    conversation: { _id: string; externalSessionId?: string | null },
    command: ProcessManagedAgentTurnCommand
  ): Promise<{ reply: { markdown?: string; card?: ChatCardReply }; sessionId?: string | null }> {
    try {
      const response = await this.runTurn(runtime.provider, conversation, command);

      return { reply: { markdown: response.content }, sessionId: response.sessionId };
    } catch (err) {
      const initFailure = runtime.runtimeProvider.parseMcpInitFailure(err);

      if (initFailure) {
        const card = await this.handleMcpInitFailure(command, initFailure.mcpServerName);

        if (card) {
          return { reply: { card } };
        }

        this.logger.warn(
          { mcpServerName: initFailure.mcpServerName, agentId: command.agentId },
          'Falling back to markdown for MCP-init failure (lazy OAuth path unavailable)'
        );

        return { reply: { markdown: this.buildMcpAuthFallbackMessage(initFailure.mcpServerName) } };
      }

      // MCP server initialisation failures are reported by the provider with a
      // generic `ThalamusError` that thalamus's mapSessionError flags as
      // `isRetryable: true`. They are NOT actually retryable — see
      // `parseMcpInitFailure` above. For anything else that's still retryable,
      // let Bull retry.
      if (err instanceof ThalamusError && err.isRetryable) {
        throw err;
      }

      this.logger.error(err, `Managed agent turn failed for agent ${command.agentId}`);

      return { reply: { markdown: this.buildErrorMessage(err) } };
    }
  }

  /**
   * Attempt the lazy-OAuth path for a parsed MCP-init failure:
   *   1. Map the runtime-side server name to a catalog `mcpId`.
   *   2. Call `POST /v1/agents/:id/mcp-servers/:mcpId/oauth/url` to mint the
   *      authorize URL (also upserts the `mcp_connection` row in `pending_oauth`).
   *   3. Call `POST /v1/agents/:id/mcp-servers/:mcpId/pending-turn` to park the
   *      job so the OAuth callback can replay it.
   *   4. Return a chat card with the "Connect" link-button for the caller to
   *      deliver via `/reply`.
   *
   * Returns `null` if any prerequisite fails (no `subscriberId`, no catalog
   * match, network error, MCP not in the Novu-OAuth allow-list). Callers
   * fall back to markdown so the platform "Typing…" still clears.
   */
  private async handleMcpInitFailure(
    command: ProcessManagedAgentTurnCommand,
    mcpServerName: string
  ): Promise<ChatCardReply | null> {
    if (!command.subscriberId) {
      this.logger.warn(
        { agentId: command.agentId },
        'Cannot offer MCP OAuth — managed-agent job is missing subscriberId'
      );

      return null;
    }

    const mcpId = this.resolveMcpIdByName(mcpServerName);
    if (!mcpId) {
      this.logger.warn({ mcpServerName }, 'MCP-init failure references a server not in MCP_SERVERS catalog');

      return null;
    }

    try {
      const authorizeUrl = await this.requestOAuthUrl(command, mcpId);
      await this.parkPendingTurn(command, mcpId);

      return this.buildConnectCard(mcpServerName, authorizeUrl);
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), mcpId, agentId: command.agentId },
        'Lazy MCP OAuth path failed; falling back to markdown'
      );

      return null;
    }
  }

  private resolveMcpIdByName(mcpServerName: string): string | undefined {
    const target = mcpServerName.toLowerCase();
    const match = MCP_SERVERS.find((s) => s.name.toLowerCase() === target);

    return match?.id;
  }

  private buildConnectCard(mcpServerName: string, authorizeUrl: string): ChatCardReply {
    return {
      type: 'card',
      children: [
        {
          type: 'text',
          content: `I need access to your ${mcpServerName} account to answer this. Connect ${mcpServerName} and I'll pick up where we left off — no need to retype your question.`,
        },
        { type: 'divider' },
        {
          type: 'actions',
          children: [
            {
              type: 'link-button',
              label: `Connect ${mcpServerName}`,
              url: authorizeUrl,
              style: 'primary',
            },
          ],
        },
      ],
    };
  }

  private async resolveRuntime(command: ProcessManagedAgentTurnCommand): Promise<ResolvedRuntime> {
    const agent = await this.agentRepository.findOne({ _id: command.agentId, _environmentId: command.environmentId }, [
      '_id',
      'identifier',
      'runtime',
      'managedRuntime',
    ]);
    if (!agent?.managedRuntime) {
      throw new Error(`Agent ${command.agentId} is not a managed agent`);
    }

    const integration = await this.integrationRepository.findOne({
      _id: agent.managedRuntime._integrationId,
      _environmentId: command.environmentId,
    });
    if (!integration?.credentials) {
      throw new Error(`Integration ${agent.managedRuntime._integrationId} not found or has no credentials`);
    }

    const creds = decryptCredentials(integration.credentials);
    if (!creds.apiKey) {
      throw new Error('Integration has no API key');
    }

    const providerId = agent.managedRuntime.providerId;
    const provider = this.createProvider(providerId, {
      apiKey: creds.apiKey,
      agentId: agent.managedRuntime.externalAgentId,
      environmentId: creds.externalEnvironmentId as string,
    });
    const runtimeProvider = getAgentRuntimeProvider(providerId, creds.apiKey);

    return { provider, runtimeProvider };
  }

  private async loadConversation(command: ProcessManagedAgentTurnCommand) {
    const conversation = await this.conversationRepository.findOne(
      { _id: command.conversationId, _environmentId: command.environmentId },
      ['_id', 'externalSessionId']
    );
    if (!conversation) {
      throw new Error(`Conversation ${command.conversationId} not found`);
    }

    return conversation;
  }

  private async runTurn(
    provider: Provider,
    conversation: { _id: string; externalSessionId?: string | null },
    command: ProcessManagedAgentTurnCommand
  ): Promise<ThalamusResponse> {
    const sessionId = conversation.externalSessionId ?? undefined;

    if (sessionId) {
      return this.streamWithSessionRecovery(provider, sessionId, command);
    }

    const messages = await this.buildMessagesWithHistory(command);

    return this.streamWithTimeout(provider, messages, undefined);
  }

  private async streamWithSessionRecovery(
    provider: Provider,
    sessionId: string,
    command: ProcessManagedAgentTurnCommand
  ): Promise<ThalamusResponse> {
    const messages = [{ role: MessageRole.USER, content: command.messageText }];

    try {
      return await this.streamWithTimeout(provider, messages, sessionId);
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) {
        throw err;
      }
    }

    this.logger.warn(`Session ${sessionId} expired, clearing and retrying with history`);
    await this.conversationRepository.clearExternalSessionId(command.environmentId, command.conversationId);

    const messagesWithHistory = await this.buildMessagesWithHistory(command);

    return this.streamWithTimeout(provider, messagesWithHistory, undefined);
  }

  private buildErrorMessage(err: unknown): string {
    if (err instanceof CredentialExpiredError) {
      return `Agent error: Credentials for "${err.serverName}" have expired. Please update them in your integration settings.`;
    }
    if (err instanceof McpServerError) {
      return `Agent error: MCP server "${err.serverName}" is unavailable (${err.statusCode ?? 'unknown status'}).`;
    }

    return 'The agent is temporarily unavailable. Please try again later.';
  }

  private buildMcpAuthFallbackMessage(mcpServerName: string): string {
    return `Agent error: "${mcpServerName}" isn't authorized yet. Connect it from the agent's MCP settings and try again.`;
  }

  private async buildMessagesWithHistory(command: ProcessManagedAgentTurnCommand): Promise<Message[]> {
    const history = await this.conversationActivityRepository.findByConversation(
      command.environmentId,
      command.conversationId,
      50
    );

    const messages: Message[] = history.reverse().map((entry) => ({
      role: entry.senderType === ConversationActivitySenderTypeEnum.AGENT ? MessageRole.ASSISTANT : MessageRole.USER,
      content: entry.content,
    }));

    messages.push({ role: MessageRole.USER, content: command.messageText });

    return messages;
  }

  /**
   * TODO: Replace Promise.race timeout with AbortSignal-based cancellation
   * once thalamus supports it — so the underlying HTTP connection is torn down
   * rather than just ignored.
   */
  private async streamWithTimeout(
    provider: Provider,
    messages: Message[],
    sessionId: string | undefined
  ): Promise<ThalamusResponse> {
    return Promise.race([
      provider.stream({ messages, sessionId }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Agent turn timed out')), MAX_TURN_MS)),
    ]);
  }

  private createProvider(
    providerId: AgentRuntimeProviderIdEnum,
    config: { apiKey: string; agentId: string; environmentId: string }
  ): Provider {
    switch (providerId) {
      case AgentRuntimeProviderIdEnum.Anthropic:
        return thalamus.anthropic(config);
      default:
        throw new Error(`Unsupported agent runtime provider: ${providerId}`);
    }
  }

  private async deliverReply(
    command: ProcessManagedAgentTurnCommand,
    reply: { markdown?: string; card?: ChatCardReply }
  ): Promise<void> {
    const apiKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: command.environmentId })
    );

    const apiBaseUrl = process.env.API_ROOT_URL;
    if (!apiBaseUrl) {
      throw new Error('API_ROOT_URL environment variable is not set — cannot deliver agent reply');
    }

    const url = `${apiBaseUrl}/v1/agents/${encodeURIComponent(command.agentIdentifier)}/reply`;

    const response = await this.httpClientService.request({
      url,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
      },
      body: {
        conversationId: command.conversationId,
        integrationIdentifier: command.integrationIdentifier,
        reply,
      },
      timeout: 30_000,
    });

    if (response.statusCode >= 400) {
      throw new Error(`Reply delivery failed (${response.statusCode}): ${JSON.stringify(response.body)}`);
    }
  }

  private async requestOAuthUrl(command: ProcessManagedAgentTurnCommand, mcpId: string): Promise<string> {
    const url = await this.buildAgentsApiUrl(
      `/v1/agents/${encodeURIComponent(command.agentIdentifier)}/mcp-servers/${encodeURIComponent(mcpId)}/oauth/url`
    );
    const apiKey = await this.getApiKey(command);

    const response = await this.httpClientService.request({
      url,
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `ApiKey ${apiKey}` },
      body: { subscriberId: command.subscriberId },
      timeout: 30_000,
    });

    if (response.statusCode >= 400) {
      throw new Error(`OAuth URL request failed (${response.statusCode}): ${JSON.stringify(response.body)}`);
    }

    // The Novu API wraps every response in `{ data: <payload> }` via the global
    // `ResponseInterceptor`, so we have to unwrap once to reach the DTO.
    const envelope = response.body as { data?: { authorizeUrl?: string } } | undefined;
    const authorizeUrl = envelope?.data?.authorizeUrl;

    if (!authorizeUrl) {
      throw new Error('OAuth URL response missing authorizeUrl');
    }

    return authorizeUrl;
  }

  private async parkPendingTurn(command: ProcessManagedAgentTurnCommand, mcpId: string): Promise<void> {
    const url = await this.buildAgentsApiUrl(
      `/v1/agents/${encodeURIComponent(command.agentIdentifier)}/mcp-servers/${encodeURIComponent(mcpId)}/pending-turn`
    );
    const apiKey = await this.getApiKey(command);
    const jobData: IManagedAgentJobData = {
      agentId: command.agentId,
      conversationId: command.conversationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      integrationIdentifier: command.integrationIdentifier,
      agentIdentifier: command.agentIdentifier,
      platform: command.platform,
      messageText: command.messageText,
      subscriberId: command.subscriberId,
      subscriberFirstName: command.subscriberFirstName,
      platformThreadId: command.platformThreadId,
    };

    const response = await this.httpClientService.request({
      url,
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `ApiKey ${apiKey}` },
      body: { subscriberId: command.subscriberId, jobData },
      timeout: 30_000,
    });

    if (response.statusCode >= 400) {
      throw new Error(`Pending-turn parking failed (${response.statusCode}): ${JSON.stringify(response.body)}`);
    }
  }

  private async getApiKey(command: ProcessManagedAgentTurnCommand): Promise<string> {
    return this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: command.environmentId })
    );
  }

  private async buildAgentsApiUrl(path: string): Promise<string> {
    const apiBaseUrl = process.env.API_ROOT_URL;
    if (!apiBaseUrl) {
      throw new Error('API_ROOT_URL environment variable is not set');
    }

    return `${apiBaseUrl}${path}`;
  }
}
