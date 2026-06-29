import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import { TelegramAgentLinkResolver } from '../telegram-agent-link.resolver';
import { TelegramMobileLinkTokenService } from '../telegram-mobile-link-token.service';
import { IssueTelegramMobileLinkCommand } from './issue-telegram-mobile-link.command';

export interface IssueTelegramMobileLinkResult {
  token: string;
  /** Absolute URL the user can open on a mobile device to complete setup. */
  url: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
}

const MOBILE_PATH = '/agents/telegram/connect';

@Injectable()
export class IssueTelegramMobileLink {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly tokenService: TelegramMobileLinkTokenService,
    private readonly agentLinkResolver: TelegramAgentLinkResolver
  ) {}

  async execute(command: IssueTelegramMobileLinkCommand): Promise<IssueTelegramMobileLinkResult> {
    const integration = await this.integrationRepository.findOne(
      {
        identifier: command.integrationIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id providerId'
    );

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationIdentifier} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.Telegram) {
      throw new BadRequestException('Mobile setup link is only available for Telegram integrations.');
    }

    const agent = await this.agentLinkResolver.resolve({
      integrationId: integration._id,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const { token, expiresAt } = await this.tokenService.issue({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: agent.agentIdentifier,
      integrationId: integration._id,
      subscriberId: command.subscriberId,
    });

    return {
      token,
      expiresAt,
      url: this.buildMobileUrl(token),
    };
  }

  private buildMobileUrl(token: string): string {
    const base = (process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL || 'https://dashboard.novu.co').replace(
      /\/$/,
      ''
    );

    return `${base}${MOBILE_PATH}/${token}`;
  }
}
