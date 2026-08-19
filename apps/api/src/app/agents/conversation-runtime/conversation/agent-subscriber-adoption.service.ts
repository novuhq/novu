import { Injectable } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import {
  AgentToolTrustRepository,
  ConversationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { AGENT_PLATFORM_PROVISION_SOURCE, AGENT_PROVISION_DATA_KEYS } from '@novu/shared';
import { AgentConversationService } from './agent-conversation.service';

/**
 * Identity pair for a subscriber involved in an adoption merge. The email
 * resolver keys conversations/activities off the external `subscriberId`
 * string, while MCP connections and tool-trust rows key off the Mongo
 * `Subscriber._id`, so both are carried here.
 */
export interface AdoptionSubscriberRef {
  /** Mongo `Subscriber._id`. */
  _id: string;
  /** External `subscriberId` string. */
  subscriberId: string;
}

/**
 * Folds auto-provisioned "phantom" email subscribers into the real,
 * customer-created subscriber that now shares their email address. This is the
 * lazy half of open-access email onboarding: someone emails the agent before
 * signing up (creating a phantom), then later signs up through the customer's
 * app with the same address — the next inbound email triggers this merge so
 * their conversation history and tool grants follow the surviving identity
 * instead of being stranded on the phantom.
 */
@Injectable()
export class AgentSubscriberAdoptionService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationService: AgentConversationService,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly agentToolTrustRepository: AgentToolTrustRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Adopt every phantom subscriber into `real`. Best-effort and idempotent: a
   * failure on any phantom is logged and swallowed so the inbound turn is never
   * blocked, and because the phantom is deleted only after its references are
   * repointed, an interrupted merge is simply retried on the next email.
   */
  async adoptPhantomsInto(params: {
    environmentId: string;
    organizationId: string;
    real: AdoptionSubscriberRef;
    phantoms: AdoptionSubscriberRef[];
  }): Promise<void> {
    for (const phantom of params.phantoms) {
      // Guard against a self-merge if a phantom is somehow also flagged real.
      if (phantom.subscriberId === params.real.subscriberId || phantom._id === params.real._id) {
        continue;
      }

      await this.adoptOne(params.environmentId, params.organizationId, params.real, phantom);
    }
  }

  private async adoptOne(
    environmentId: string,
    organizationId: string,
    real: AdoptionSubscriberRef,
    phantom: AdoptionSubscriberRef
  ): Promise<void> {
    try {
      const conversations = await this.conversationRepository.repointSubscriberParticipant({
        environmentId,
        organizationId,
        fromSubscriberId: phantom.subscriberId,
        toSubscriberId: real.subscriberId,
      });

      const activities = await this.conversationService.repointSubscriberSender({
        environmentId,
        organizationId,
        fromSubscriberId: phantom.subscriberId,
        toSubscriberId: real.subscriberId,
      });

      const mcp = await this.mcpConnectionRepository.repointSubscriberConnections({
        environmentId,
        organizationId,
        fromSubscriberId: phantom._id,
        toSubscriberId: real._id,
      });

      const trust = await this.agentToolTrustRepository.repointSubscriber({
        environmentId,
        organizationId,
        fromSubscriberId: phantom._id,
        toSubscriberId: real._id,
      });

      // Delete the phantom last, and only when it still carries the
      // auto-provision provenance marker, so a customer-created subscriber can
      // never be removed by this path even if it was misclassified upstream.
      await this.subscriberRepository.delete({
        _environmentId: environmentId,
        subscriberId: phantom.subscriberId,
        [`data.${AGENT_PROVISION_DATA_KEYS.source}`]: AGENT_PLATFORM_PROVISION_SOURCE,
      });

      this.analyticsService.track('[Agent Platform] - Subscriber adopted', organizationId, {
        _organization: organizationId,
        environmentId,
        phantomSubscriberId: phantom.subscriberId,
        realSubscriberId: real.subscriberId,
        conversations,
        activities,
        mcpConnectionsMoved: mcp.moved,
        mcpConnectionsDropped: mcp.dropped,
        toolTrustMoved: trust.moved,
        toolTrustDropped: trust.dropped,
      });

      this.logger.info(
        {
          environmentId,
          organizationId,
          phantomSubscriberId: phantom.subscriberId,
          realSubscriberId: real.subscriberId,
          conversations,
          activities,
          mcp,
          trust,
        },
        'Adopted auto-provisioned email subscriber into customer-created subscriber'
      );
    } catch (err) {
      this.logger.warn(
        err,
        `Failed to adopt phantom subscriber ${phantom.subscriberId} into ${real.subscriberId}; will retry on next inbound turn`
      );
    }
  }
}
