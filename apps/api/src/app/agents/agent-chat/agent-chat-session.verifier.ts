import { Injectable } from '@nestjs/common';
import type { AgentChatSession } from '@novu/chat-adapter-agent-chat';
import type { ISubscriberJwt } from '@novu/shared';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../auth/services/auth.service';

/** Inbox subscriber JWT verification for agent-chat POST ingress. */
@Injectable()
export class AgentChatSessionVerifier {
  constructor(private readonly authService: AuthService) {}

  async verifySession(request: Request): Promise<AgentChatSession | null> {
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
      };
    } catch {
      return null;
    }
  }
}
