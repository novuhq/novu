import { Injectable } from '@nestjs/common';
import type { WebChatSession } from '@novu/chat-adapter-web-chat';
import { type ISubscriberJwt, SubscriberSessionAuthMethodEnum } from '@novu/shared';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../auth/services/auth.service';

/** Inbox subscriber JWT verification for web-chat POST ingress. */
@Injectable()
export class WebChatSessionVerifier {
  constructor(private readonly authService: AuthService) {}

  /** For an agent's webhook: the session must belong to the agent's environment and organization. */
  async verifySessionIn(
    request: Request,
    scope: { environmentId: string; organizationId: string }
  ): Promise<WebChatSession | null> {
    const session = await this.verifySession(request);
    if (session?.environmentId !== scope.environmentId || session.organizationId !== scope.organizationId) {
      return null;
    }

    return session;
  }

  /** Any valid session; the caller binds it to the session's own environment. */
  async verifySession(request: Request): Promise<WebChatSession | null> {
    const header = request.headers.get('authorization');
    if (!header?.toLowerCase().startsWith('bearer ')) {
      return null;
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token || !process.env.JWT_SECRET) {
      return null;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET) as ISubscriberJwt;
      if (payload.aud !== 'widget_user') {
        return null;
      }

      const subscriber = await this.authService.validateSubscriber(payload);
      if (!subscriber) {
        return null;
      }

      return {
        subscriberId: subscriber.subscriberId,
        environmentId: subscriber._environmentId,
        organizationId: subscriber._organizationId,
        contextKeys: Array.isArray(payload.contextKeys) ? payload.contextKeys : [],
        contextVerified: payload.authMethod === SubscriberSessionAuthMethodEnum.TOKEN,
      };
    } catch {
      return null;
    }
  }
}
