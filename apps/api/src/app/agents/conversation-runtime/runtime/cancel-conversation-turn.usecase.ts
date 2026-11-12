import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  type ConversationChannel,
  type ConversationEntity,
  ConversationParticipantTypeEnum,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { AgentConfigResolver, type ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { resolveLifecycleChannel } from '../conversation/run-lifecycle-activity';
import { OutboundGateway } from '../egress/outbound.gateway';
import { InboundConnectionContextResolver } from '../ingress/inbound-connection-context.resolver';
import { type ActiveAgentTurn, AgentTurnAbortStore } from './agent-turn-abort.store';
import { BridgeExecutorService } from './bridge-executor.service';
import { buildAgentPlatformContext, buildEmailPlatformContext } from './build-platform-context.util';
import { CancelConversationTurnCommand } from './cancel-conversation-turn.command';

export type CancelConversationTurnResult = { status: 'aborted' | 'idle' };

/**
 * Stops the turn a conversation is running, on any pod and for any channel. The turn ends for readers right away:
 * its run is finished as `aborted` (or, stopped before it started, gets an aborted finish of its own), and its late
 * events are dropped at ingest, where the bridge learns to abort. The bridge is then sent `onAbort` as a fresh turn,
 * when it answered the stopped turn listing `onAbort` among the events it handles.
 */
@Injectable()
export class CancelConversationTurn {
  constructor(
    private readonly turnAbortStore: AgentTurnAbortStore,
    private readonly conversationService: AgentConversationService,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly connectionContextResolver: InboundConnectionContextResolver,
    private readonly bridgeExecutor: BridgeExecutorService,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: CancelConversationTurnCommand): Promise<CancelConversationTurnResult> {
    const conversation = await this.conversationService.getConversation(
      command.conversationId,
      command.environmentId,
      command.organizationId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const conversationId = String(conversation._id);
    const activeTurn = await this.turnAbortStore.getActiveTurn(conversationId);
    if (!activeTurn) {
      await this.assertNoUnstoppableRun(conversation, command);
      this.logger.info({ conversationId }, 'Agent turn stop found no running turn');

      return { status: 'idle' };
    }

    const { turnId } = activeTurn;
    // Marked first, so every event the bridge posts from here on is dropped. Only the Stop that marks the turn goes
    // on, so a repeated or concurrent Stop changes nothing.
    if (!(await this.turnAbortStore.markAborted(turnId))) {
      this.logger.info({ conversationId, turnId }, 'Agent turn was already stopped');

      return { status: 'aborted' };
    }

    const channel = resolveLifecycleChannel(conversation);
    const runId = await this.finishRunAsAborted(conversation, channel, activeTurn, command).catch(async (err) => {
      // Otherwise a retried Stop would find the turn aborted and its run would stay open.
      await this.turnAbortStore.unmarkAborted(turnId);
      throw err;
    });

    const config = await this.resolveConfig(conversation, channel, command);
    await this.stopTyping(conversation, channel, config);

    this.logger.info({ conversationId, turnId, runId }, 'Agent turn stopped');

    if (config && !activeTurn.bridgeHandlesOnAbort) {
      this.logger.info({ conversationId, turnId }, 'Agent bridge does not handle onAbort; not sending it');
    } else if (config) {
      await this.dispatchOnAbort(conversation, channel, config, activeTurn, command);
    }

    return { status: 'aborted' };
  }

  /**
   * Managed agents run their turns outside the bridge, so the abort store never records them. Reporting `idle` while
   * such a run is open would make clients treat the reply as finished while the agent keeps going.
   */
  private async assertNoUnstoppableRun(
    conversation: ConversationEntity,
    command: CancelConversationTurnCommand
  ): Promise<void> {
    const agent = await this.agentRepository.findOne(
      { _id: conversation._agentId, _environmentId: command.environmentId },
      ['runtime']
    );
    if (agent?.runtime !== 'managed') {
      return;
    }

    const openRunId = await this.conversationService.findOpenRunId({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      conversationId: String(conversation._id),
    });
    if (openRunId) {
      throw new UnprocessableEntityException('Stopping a managed agent turn is not supported');
    }
  }

  /**
   * Ends the turn's run as `aborted` under the run's own finish identifier, so the bridge's later `completed` (when
   * it slips past ingest) dedupes against it. A turn stopped before its `run-start` arrived gets a run of its own:
   * its start is dropped at ingest, and readers still see the run end. Returns the finished run's id.
   */
  private async finishRunAsAborted(
    conversation: ConversationEntity,
    channel: ConversationChannel,
    activeTurn: ActiveAgentTurn,
    command: CancelConversationTurnCommand
  ): Promise<string> {
    const conversationId = String(conversation._id);
    const openRunId = await this.conversationService.findOpenRunId({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      conversationId,
      turnMessageId: activeTurn.platformMessageId,
    });
    const runId = openRunId ?? `stopped_${activeTurn.turnId}`;

    const agent = await this.agentRepository.findOne(
      { _id: conversation._agentId, _environmentId: command.environmentId },
      ['identifier']
    );

    await this.conversationService.persistRunLifecycle({
      conversationId,
      channel,
      agentIdentifier: agent?.identifier ?? conversation._agentId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      runId,
      event: { type: 'run-finish', outcome: 'aborted' },
    });

    return runId;
  }

  /** Fails soft: without a config the turn is still stopped, only the typing stop and `onAbort` are skipped. */
  private async resolveConfig(
    conversation: ConversationEntity,
    channel: ConversationChannel,
    command: CancelConversationTurnCommand
  ): Promise<ResolvedAgentConfig | undefined> {
    try {
      const integration = await this.integrationRepository.findOne(
        { _id: channel._integrationId, _environmentId: command.environmentId, _organizationId: command.organizationId },
        { identifier: 1 }
      );
      if (!integration?.identifier) {
        return undefined;
      }

      return await this.agentConfigResolver.resolve(conversation._agentId, integration.identifier);
    } catch (err) {
      this.logger.warn({ err, conversationId: conversation._id }, 'Could not resolve the agent config of a stop');

      return undefined;
    }
  }

  private async stopTyping(
    conversation: ConversationEntity,
    channel: ConversationChannel,
    config: ResolvedAgentConfig | undefined
  ): Promise<void> {
    if (!config) {
      return;
    }

    try {
      await this.outboundGateway.stopTypingInConversation(
        conversation._agentId,
        config.integrationIdentifier,
        channel.platformThreadId,
        channel.workspace?.id
      );
    } catch (err) {
      this.logger.warn({ err, conversationId: conversation._id }, 'Failed to stop typing for a stopped turn');
    }
  }

  /** Sent like `onResolve`: a fresh bridge turn, so the agent can react (e.g. offer to revert what it saved). */
  private async dispatchOnAbort(
    conversation: ConversationEntity,
    channel: ConversationChannel,
    config: ResolvedAgentConfig,
    abortedTurn: ActiveAgentTurn,
    command: CancelConversationTurnCommand
  ): Promise<void> {
    try {
      const subscriberParticipant = conversation.participants.find(
        (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
      );
      const subscriber = subscriberParticipant
        ? await this.subscriberRepository.findBySubscriberId(command.environmentId, subscriberParticipant.id)
        : null;
      const { context, bridgeUrl } = await this.connectionContextResolver.resolve(config, {
        contextKeys: command.contextKeys ?? [],
      });

      await this.bridgeExecutor.execute({
        event: AgentEventEnum.ON_ABORT,
        config,
        conversation,
        subscriber,
        context,
        bridgeUrlOverride: bridgeUrl,
        message: null,
        platformThreadId: channel.platformThreadId,
        abortedTurn,
        platformContext: buildAgentPlatformContext({
          platformThreadId: channel.platformThreadId,
          channelId: '',
          isDM: false,
          message: null,
          email: buildEmailPlatformContext({
            platform: config.platform,
            message: null,
            firstPlatformMessageId: channel.firstPlatformMessageId,
          }),
        }),
      });
    } catch (err) {
      // Best-effort: the turn is already stopped in the timeline whether or not the bridge hears about it.
      this.logger.warn({ err, conversationId: conversation._id }, 'Failed to send onAbort to the agent bridge');
    }
  }
}
