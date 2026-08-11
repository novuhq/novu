import { Injectable } from '@nestjs/common';
import type { WebChatSession } from '@novu/chat-adapter-web';
import type { ISubscriberJwt } from '@novu/shared';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../auth/services/auth.service';

/** Inbox subscriber JWT verification for web-chat POST ingress. */
@Injectable()
export class WebChatSessionVerifier {
  constructor(private readonly authService: AuthService) {}

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
      };
    } catch {
      return null;
    }
  }
}
