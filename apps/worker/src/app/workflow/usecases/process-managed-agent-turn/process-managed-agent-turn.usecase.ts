import { Injectable } from '@nestjs/common';
import {
  decryptCredentials,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  HttpClientService,
  PinoLogger,
} from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationRepository,
  IntegrationRepository,
} from '@novu/dal';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
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
    const provider = await this.resolveProvider(command);
    const conversation = await this.loadConversation(command);
    const response = await this.runTurnOrFallback(provider, conversation, command);

    if (response.sessionId) {
      await this.conversationRepository.setExternalSessionIdIfMissing(
        command.environmentId,
        command.conversationId,
        response.sessionId
      );
    }

    await this.deliverReply(command, response.content);
  }

  private async runTurnOrFallback(
    provider: Provider,
    conversation: { _id: string; externalSessionId?: string | null },
    command: ProcessManagedAgentTurnCommand
  ): Promise<ThalamusResponse> {
    try {
      return await this.runTurn(provider, conversation, command);
    } catch (err) {
      if (err instanceof ThalamusError && err.isRetryable) {
        throw err;
      }

      this.logger.error(err, `Managed agent turn failed for agent ${command.agentId}`);

      return { content: this.buildErrorMessage(err), finishReason: 'error' };
    }
  }

  private async resolveProvider(command: ProcessManagedAgentTurnCommand): Promise<Provider> {
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

    return this.createProvider(agent.managedRuntime.providerId, {
      apiKey: creds.apiKey,
      agentId: agent.managedRuntime.externalAgentId,
      environmentId: creds.externalEnvironmentId as string,
    });
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

  private async deliverReply(command: ProcessManagedAgentTurnCommand, content: string): Promise<void> {
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
        reply: { markdown: content },
      },
      timeout: 30_000,
    });

    if (response.statusCode >= 400) {
      throw new Error(`Reply delivery failed (${response.statusCode}): ${JSON.stringify(response.body)}`);
    }
  }
}
