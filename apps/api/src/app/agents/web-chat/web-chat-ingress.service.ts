import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { InboundDispatcher } from '../conversation-runtime/ingress/inbound.dispatcher';
import { toWebRequest } from '../shared/util/express-to-web-request';
import { WebChatPublicationService } from './web-chat-publication.service';
import { WebChatSessionVerifier } from './web-chat-session.verifier';

/**
 * Thin Nest edge for POST /v1/web-chat/conversations: feature flags + publication
 * gate + config resolve, then uniform spine via InboundDispatcher → adapter.handleWebhook.
 * Inbox JWT auth for POST lives in adapter `verifySession` (also used here for the
 * publication gate, which needs env/org before getOrCreate).
 */
@Injectable()
export class WebChatIngressService {
  constructor(
    private readonly sessionVerifier: WebChatSessionVerifier,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly publicationService: WebChatPublicationService,
    private readonly inboundDispatcher: InboundDispatcher
  ) {}

  async handleCreateConversation(req: ExpressRequest, res: ExpressResponse): Promise<void> {
    try {
      const session = await this.sessionVerifier.verifySession(toWebRequest(req));
      if (!session) {
        res.status(401).json({ message: 'Unauthorized' });

        return;
      }

      const webChatEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_AGENT_WEB_CHAT_ENABLED,
        defaultValue: false,
        organization: { _id: session.organizationId },
        environment: { _id: session.environmentId },
      });
      if (!webChatEnabled) {
        throw new NotFoundException();
      }

      const conversationalEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED,
        defaultValue: false,
        organization: { _id: session.organizationId },
        environment: { _id: session.environmentId },
      });
      if (!conversationalEnabled) {
        throw new NotFoundException();
      }

      const agentIdentifier = typeof req.body?.agentId === 'string' ? req.body.agentId.trim() : '';
      if (!agentIdentifier) {
        throw new BadRequestException('agentId is required');
      }

      const published = await this.publicationService.resolvePublishedAgent(
        agentIdentifier,
        session.environmentId,
        session.organizationId
      );

      await this.inboundDispatcher.handleWebhook(published.agentId, published.integrationIdentifier, req, res, {
        source: 'webhook_message',
      });
    } catch (err) {
      if (err instanceof HttpException) {
        res.status(err.getStatus()).json(err.getResponse());

        return;
      }

      throw err;
    }
  }
}
