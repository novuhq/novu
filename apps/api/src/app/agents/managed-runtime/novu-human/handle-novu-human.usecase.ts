import { forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import {
  buildNovuHumanRequestId,
  FeatureFlagsKeysEnum,
  HUMAN_INTERACTION_MAX_CHOOSE_OPTIONS,
  HumanInteractionKindEnum,
} from '@novu/shared';
import { CreateConversationInteractionCommand } from '../../../human/usecases/create-conversation-interaction/create-conversation-interaction.command';
import { CreateConversationInteraction } from '../../../human/usecases/create-conversation-interaction/create-conversation-interaction.usecase';
import { AgentConversationService } from '../../conversation-runtime/conversation/agent-conversation.service';
import { ManagedAgentService } from '../managed-agent.service';
import { HandleNovuHumanCommand } from './handle-novu-human.command';

const HUMAN_KINDS = new Set<string>(Object.values(HumanInteractionKindEnum));

@Injectable()
export class HandleNovuHuman {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly createConversationInteraction: CreateConversationInteraction,
    @Inject(forwardRef(() => ManagedAgentService))
    private readonly managedAgentService: ManagedAgentService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: HandleNovuHumanCommand): Promise<void> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_HUMAN_HITL_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
      environment: { _id: command.environmentId },
    });

    if (!isEnabled) {
      await this.resumeWithError(command, 'hitl_disabled', 'Human-in-the-loop is not enabled for this environment.');

      return;
    }

    const parsed = parseNovuHumanInput(command.input);
    if (!parsed.ok) {
      await this.resumeWithError(command, parsed.code, parsed.message);

      return;
    }

    const conversation = await this.conversationService.getConversation(
      command.conversationId,
      command.environmentId,
      command.organizationId
    );

    if (!conversation) {
      await this.resumeWithError(command, 'conversation_not_found', 'Conversation was not found.');

      return;
    }

    try {
      const channel = this.conversationService.getPrimaryChannel(conversation);

      await this.createConversationInteraction.execute(
        CreateConversationInteractionCommand.create({
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          conversation,
          channel,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          kind: parsed.kind,
          prompt: parsed.prompt,
          requestId: buildNovuHumanRequestId(command.sessionId, command.toolUseId),
          options: parsed.options,
          from: parsed.from ?? command.agentIdentifier,
          ttlSeconds: parsed.ttlSeconds,
          ...(command.subscriberId ? { to: command.subscriberId } : {}),
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = err instanceof HttpException && err.getStatus() === 429 ? 'pending_cap' : 'create_failed';
      this.logger.warn(
        { err, conversationId: command.conversationId, toolUseId: command.toolUseId },
        'Failed to create managed HITL interaction'
      );
      await this.resumeWithError(command, code, message);

      return;
    }

    if (parsed.kind === HumanInteractionKindEnum.TELL) {
      await this.sendToolResult(command, {
        ok: true,
        kind: parsed.kind,
        status: 'delivered',
        instruction: 'Notice delivered. Continue the turn. Do not wait for a reply.',
      });
    }
  }

  private async resumeWithError(command: HandleNovuHumanCommand, code: string, message: string): Promise<void> {
    await this.sendToolResult(command, {
      ok: false,
      error: code,
      message,
      instruction: 'HITL was not created. Do not retry the same call. Continue without that human decision.',
    });
  }

  private async sendToolResult(command: HandleNovuHumanCommand, content: Record<string, unknown>): Promise<void> {
    await this.managedAgentService.sendToolResult({
      conversationId: command.conversationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      subscriberId: command.subscriberId,
      toolUseId: command.toolUseId,
      content: JSON.stringify(content),
      platform: command.platform,
      platformThreadId: command.platformThreadId,
    });
  }
}

type ParsedNovuHumanInput =
  | {
      ok: true;
      kind: HumanInteractionKindEnum;
      prompt: string;
      options?: string[];
      from?: string;
      ttlSeconds?: number;
    }
  | { ok: false; code: string; message: string };

function parseNovuHumanInput(input: Record<string, unknown> | undefined): ParsedNovuHumanInput {
  const kindRaw = typeof input?.kind === 'string' ? input.kind.trim() : '';
  if (!HUMAN_KINDS.has(kindRaw)) {
    return { ok: false, code: 'invalid_kind', message: 'kind must be ask, approve, choose, or tell.' };
  }

  const kind = kindRaw as HumanInteractionKindEnum;
  const prompt = typeof input?.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt) {
    return { ok: false, code: 'invalid_prompt', message: 'prompt is required.' };
  }

  const from = typeof input?.from === 'string' && input.from.trim() ? input.from.trim() : undefined;
  const ttlSeconds =
    typeof input?.ttlSeconds === 'number' && Number.isFinite(input.ttlSeconds) ? input.ttlSeconds : undefined;

  if (kind !== HumanInteractionKindEnum.CHOOSE) {
    return { ok: true, kind, prompt, from, ttlSeconds };
  }

  const options = Array.isArray(input?.options)
    ? input.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : [];

  if (options.length < 2 || options.length > HUMAN_INTERACTION_MAX_CHOOSE_OPTIONS) {
    return {
      ok: false,
      code: 'invalid_options',
      message: `choose requires between 2 and ${HUMAN_INTERACTION_MAX_CHOOSE_OPTIONS} options.`,
    };
  }

  return { ok: true, kind, prompt, options, from, ttlSeconds };
}
