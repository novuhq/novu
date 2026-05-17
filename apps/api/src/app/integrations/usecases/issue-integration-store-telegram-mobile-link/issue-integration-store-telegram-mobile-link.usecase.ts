import { Injectable } from '@nestjs/common';

import { TelegramMobileLinkTokenService } from '../../../agents/services/telegram-mobile-link-token.service';
import { IssueIntegrationStoreTelegramMobileLinkCommand } from './issue-integration-store-telegram-mobile-link.command';

export interface IssueIntegrationStoreTelegramMobileLinkResult {
  token: string;
  /** Absolute URL the user can open on a mobile device to complete Telegram setup. */
  url: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
}

const MOBILE_PATH = '/integrations/telegram/connect';

/**
 * Issues a signed, single-use, short-lived JWT that lets an unauthenticated
 * mobile visitor create a Telegram integration in the issuing environment.
 *
 * Unlike the agent-scoped issuer ({@link IssueTelegramMobileLink}), this flow
 * carries no agent or integration id — the consume use-case creates a brand
 * new integration on the user's behalf.
 */
@Injectable()
export class IssueIntegrationStoreTelegramMobileLink {
  constructor(private readonly tokenService: TelegramMobileLinkTokenService) {}

  async execute(
    command: IssueIntegrationStoreTelegramMobileLinkCommand
  ): Promise<IssueIntegrationStoreTelegramMobileLinkResult> {
    const { token, expiresAt } = await this.tokenService.issueForIntegrationStore({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    return {
      token,
      expiresAt,
      url: this.buildMobileUrl(token),
    };
  }

  private buildMobileUrl(token: string): string {
    const base = (process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL || '').replace(/\/$/, '');

    return `${base}${MOBILE_PATH}/${token}`;
  }
}
