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

/**
 * Anthropic returns this 400 when the session is parked in `requires_action`
 * (e.g. an MCP tool fired with `permission_policy: always_ask`) and the worker
 * tries to push a fresh `user.message`. We use it as a signal to fetch the
 * pending tool details and surface an Approve/Deny card to the user instead.
 */
const AWAITING_TOOL_RESPONSES_PATTERN = /waiting on responses to events/i;
const REQUIRES_ACTION_FINISH_REASON = 'requires-action';
/**
 * Card-button id prefix that the inbound action router uses to recognise
 * MCP tool-approval clicks and route them back to the managed executor.
 * Keep in sync with `agent-inbound-handler.service.ts`
 * (`MCP_APPROVAL_ACTION_PREFIX`).
 */
const MCP_APPROVAL_ACTION_PREFIX = 'mcp-approval:';

interface ResolvedRuntime {
  /** Streaming provider used to actually run the turn. */
  provider: Provider;
  /**
   * In-repo `IAgentRuntimeProvider` instance for the same runtime — exposed
   * separately so we can call capability-bound helpers (e.g.
   * `parseMcpInitFailure`) without coupling the worker to thalamus internals.
   */
  runtimeProvider: IAgentRuntimeProvider;
  /**
   * Vault IDs to bind to every session created on this turn. Anthropic's
   * `beta.sessions.create` only exposes vault credentials to MCP servers when
   * `vault_ids` is set; omitting it makes any OAuth-protected MCP fail
   * initialise with "no credential is stored for this server URL".
   */
  vaultIds: string[];
}

/** Card shape sent to `/v1/agents/.../reply`. */
type ChatCardReply = {
  type: 'card';
  children: Array<
    | { type: 'text'; content: string }
    | { type: 'divider' }
    | {
        type: 'actions';
        children: Array<CardLinkButton | CardActionButton>;
      }
  >;
};

type CardLinkButton = {
  type: 'link-button';
  label: string;
  url: string;
  style?: 'primary' | 'secondary';
};

type CardActionButton = {
  type: 'button';
  id: string;
  label: string;
  style?: 'primary' | 'danger' | 'default';
  value?: string;
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

    if (outcome.clearSession) {
      await this.conversationRepository.clearExternalSessionId(command.environmentId, command.conversationId);
    } else if (outcome.sessionId) {
      await this.conversationRepository.setExternalSessionIdIfMissing(
        command.environmentId,
        command.conversationId,
        outcome.sessionId
      );
    }

    if (!outcome.suppressReply) {
      await this.deliverReply(command, outcome.reply);
    }
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
  ): Promise<{
    reply: { markdown?: string; card?: ChatCardReply };
    sessionId?: string | null;
    clearSession?: boolean;
    /**
     * When true, `execute` skips the `/reply` call. Used on dead-end paths
     * where there's no useful surface to show the user (e.g. a confirmation
     * was processed and the agent has no follow-up content yet).
     */
    suppressReply?: boolean;
  }> {
    try {
      const response = await this.runTurn(runtime, conversation, command);

      // The runtime parked the session on a tool-confirmation event. Surface
      // an Approve/Deny card to the user so they can decide — we keep the
      // session id so the follow-up click resumes the same conversation.
      if (response.finishReason === REQUIRES_ACTION_FINISH_REASON) {
        const sessionId = response.sessionId ?? conversation.externalSessionId ?? undefined;
        const approval = sessionId ? await this.tryFetchPendingApproval(runtime, sessionId) : null;

        if (approval && sessionId) {
          this.logger.info(
            {
              agentId: command.agentId,
              sessionId,
              toolUseId: approval.toolUseId,
              toolName: approval.toolName,
              mcpServerName: approval.mcpServerName,
            },
            'Surfacing MCP tool-approval card for managed-agent turn'
          );

          return {
            reply: { card: this.buildToolApprovalCard(approval) },
            sessionId,
          };
        }

        this.logger.warn(
          { agentId: command.agentId, sessionId },
          'Agent turn finished in requires-action but no pending tool could be fetched; falling back to markdown'
        );

        return {
          reply: { markdown: this.buildAwaitingApprovalMessage() },
          sessionId,
        };
      }

      // A tool-confirmation resume can complete without producing any agent
      // text content (e.g. a denied call where the agent immediately invokes
      // another tool that also needs approval). The next iteration of
      // requires-action above re-surfaces an approval card — we don't want
      // an empty markdown reply landing in the user's chat in the meantime.
      if (command.toolConfirmation && (response.content ?? '').length === 0) {
        return { reply: { markdown: '' }, sessionId: response.sessionId, suppressReply: true };
      }

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

      // 400 "waiting on responses to events" — the conversation's stored
      // session has a pending tool approval from before this user message.
      // Fetch the pending tool and re-surface the Approve/Deny card so the
      // user can finally resolve it (their current message is dropped on the
      // floor; the approval flow takes precedence).
      if (this.isAwaitingToolResponsesError(err)) {
        const sessionId = conversation.externalSessionId ?? undefined;
        const approval = sessionId ? await this.tryFetchPendingApproval(runtime, sessionId) : null;

        if (approval && sessionId) {
          this.logger.warn(
            {
              agentId: command.agentId,
              sessionId,
              toolUseId: approval.toolUseId,
            },
            'Existing session is awaiting tool approval; re-surfacing approval card'
          );

          return {
            reply: { card: this.buildToolApprovalCard(approval) },
            sessionId,
          };
        }

        this.logger.warn(
          { agentId: command.agentId },
          'Session is awaiting tool responses but no pending tool resolved; clearing session id'
        );

        return {
          reply: { markdown: this.buildAwaitingApprovalMessage() },
          clearSession: true,
        };
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

  private async tryFetchPendingApproval(runtime: ResolvedRuntime, sessionId: string) {
    try {
      return await runtime.runtimeProvider.getPendingToolApproval(sessionId);
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), sessionId },
        'Failed to fetch pending tool approval from runtime provider'
      );

      return null;
    }
  }

  private buildToolApprovalCard(approval: {
    toolUseId: string;
    toolName: string;
    mcpServerName?: string;
    input?: Record<string, unknown>;
  }): ChatCardReply {
    const source = approval.mcpServerName ? `${approval.mcpServerName} \u2022 ${approval.toolName}` : approval.toolName;
    const inputPreview = this.previewToolInput(approval.input);
    const lines = [
      `The agent wants to run **${source}**. Approve to continue, or deny to stop.`,
      ...(inputPreview ? ['', '```', inputPreview, '```'] : []),
    ];

    return {
      type: 'card',
      children: [
        { type: 'text', content: lines.join('\n') },
        { type: 'divider' },
        {
          type: 'actions',
          children: [
            {
              type: 'button',
              id: `${MCP_APPROVAL_ACTION_PREFIX}allow:${approval.toolUseId}`,
              label: 'Approve',
              style: 'primary',
            },
            {
              type: 'button',
              id: `${MCP_APPROVAL_ACTION_PREFIX}deny:${approval.toolUseId}`,
              label: 'Deny',
              style: 'danger',
            },
          ],
        },
      ],
    };
  }

  private previewToolInput(input: Record<string, unknown> | undefined): string | null {
    if (!input || Object.keys(input).length === 0) {
      return null;
    }

    try {
      const json = JSON.stringify(input, null, 2);

      return json.length > 1500 ? `${json.slice(0, 1500)}\n...` : json;
    } catch {
      return null;
    }
  }

  private isAwaitingToolResponsesError(err: unknown): boolean {
    if (!(err instanceof ThalamusError)) {
      return false;
    }

    return AWAITING_TOOL_RESPONSES_PATTERN.test(err.message ?? '');
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
    const externalVaultId = (creds as { externalVaultId?: string }).externalVaultId;
    const vaultIds = externalVaultId ? [externalVaultId] : [];

    return { provider, runtimeProvider, vaultIds };
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
    runtime: ResolvedRuntime,
    conversation: { _id: string; externalSessionId?: string | null },
    command: ProcessManagedAgentTurnCommand
  ): Promise<ThalamusResponse> {
    const sessionId = conversation.externalSessionId ?? undefined;

    // Resume path: a user click on the previously surfaced Approve/Deny card
    // funnels here as a fresh job carrying `toolConfirmation`. We MUST reuse
    // the same session (the tool_use_id is scoped to it) and we send a
    // `user.tool_confirmation` event rather than a new `user.message`.
    if (command.toolConfirmation) {
      if (!sessionId) {
        throw new Error(
          `Cannot resume managed-agent turn with a tool confirmation: conversation ${command.conversationId} has no externalSessionId`
        );
      }

      return this.streamWithToolConfirmation(runtime, sessionId, command.toolConfirmation);
    }

    if (sessionId) {
      return this.streamWithSessionRecovery(runtime, sessionId, command);
    }

    const messages = await this.buildMessagesWithHistory(command);

    return this.streamWithTimeout(runtime, messages, undefined);
  }

  private async streamWithToolConfirmation(
    runtime: ResolvedRuntime,
    sessionId: string,
    confirmation: { toolUseId: string; approved: boolean; denyMessage?: string }
  ): Promise<ThalamusResponse> {
    const streamParams: Parameters<Provider['stream']>[0] = {
      messages: [],
      sessionId,
      toolResults: [{ toolUseId: confirmation.toolUseId, approved: confirmation.approved }],
    };
    if (runtime.vaultIds.length > 0) {
      streamParams.vaultIds = runtime.vaultIds;
    }

    return Promise.race([
      runtime.provider.stream(streamParams),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Agent turn timed out')), MAX_TURN_MS)),
    ]);
  }

  private async streamWithSessionRecovery(
    runtime: ResolvedRuntime,
    sessionId: string,
    command: ProcessManagedAgentTurnCommand
  ): Promise<ThalamusResponse> {
    const messages = [{ role: MessageRole.USER, content: command.messageText }];

    try {
      return await this.streamWithTimeout(runtime, messages, sessionId);
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) {
        throw err;
      }
    }

    this.logger.warn(`Session ${sessionId} expired, clearing and retrying with history`);
    await this.conversationRepository.clearExternalSessionId(command.environmentId, command.conversationId);

    const messagesWithHistory = await this.buildMessagesWithHistory(command);

    return this.streamWithTimeout(runtime, messagesWithHistory, undefined);
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

  private buildAwaitingApprovalMessage(): string {
    return "The agent tried to use a tool that requires manual approval, which isn't supported in this chat. Ask an administrator to update the agent's tool permissions to allow this tool automatically.";
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
    runtime: ResolvedRuntime,
    messages: Message[],
    sessionId: string | undefined
  ): Promise<ThalamusResponse> {
    const streamParams: { messages: Message[]; sessionId: string | undefined; vaultIds?: string[] } = {
      messages,
      sessionId,
    };
    if (runtime.vaultIds.length > 0) {
      streamParams.vaultIds = runtime.vaultIds;
    }

    return Promise.race([
      runtime.provider.stream(streamParams),
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
