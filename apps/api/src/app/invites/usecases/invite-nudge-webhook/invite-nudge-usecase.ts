import { Injectable, Scope } from '@nestjs/common';
import { MemberRepository } from '@novu/dal';
import { createHash } from '@novu/application-generic';
import axios from 'axios';

import { InviteNudgeWebhookCommand } from './invite-nudge-command';

const axiosInstance = axios.create();

@Injectable({
  scope: Scope.REQUEST,
})
export class InviteNudgeWebhook {
  constructor(private memberRepository: MemberRepository) {}

  async execute(command: InviteNudgeWebhookCommand) {
    if (
      (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'production') &&
      process.env.NOVU_API_KEY &&
      process.env.NOVU_ENVIRONMENT_ID
    ) {
      const hmacHash = createHash(process.env.NOVU_API_KEY || '', command?.body?.subscriber?._environmentId || '');
      const hmacHashFromWebhook = command?.headers?.['nv-hmac-256'];

      if (hmacHash !== hmacHashFromWebhook) {
        throw new Error('Unauthorized request');
      }

      const membersCount = await this.memberRepository.count({
        _organizationId: command?.body?.subscriber?._organizationId,
      });

      if (membersCount === 1) {
        return await axiosInstance.post(
          `https://api.hubapi.com/contacts/v1/lists/${process.env.HUBSPOT_INVITE_NUDGE_EMAIL_USER_LIST}/add`,
          {
            emails: [command?.body?.subscriber?.email],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_ACCESS_TOKEN}`,
            },
          }
        );
      }
    }

    return { send: false };
  }
}
