import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { SlackQuickSetupCommand } from '../../../../integrations/usecases/slack-quick-setup/slack-quick-setup.command';
import { SlackQuickSetup } from '../../../../integrations/usecases/slack-quick-setup/slack-quick-setup.usecase';
import {
  InvalidTelegramMobileTokenError,
  SlackAgentSetupLinkPayload,
  TelegramMobileLinkTokenService,
} from '../../../../telegram-linking/telegram-mobile-link-token.service';
import { ConsumeSlackSetupLinkCommand } from './consume-slack-setup-link.command';

export interface ConsumeSlackSetupLinkResult {
  success: true;
}

/**
 * Sentinel userId for Slack quick-setup invoked from the public setup page.
 * Satisfies OrganizationCommand validation; not a real Novu user.
 */
const SYNTHETIC_USER_ID = 'slack-setup-link';

@Injectable()
export class ConsumeSlackSetupLink {
  constructor(
    private readonly tokenService: TelegramMobileLinkTokenService,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly slackQuickSetupUsecase: SlackQuickSetup,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ConsumeSlackSetupLinkCommand): Promise<ConsumeSlackSetupLinkResult> {
    const claimed = await this.claimToken(command.token);
    const payload = claimed.payload as SlackAgentSetupLinkPayload;

    try {
      const agent = await this.agentRepository.findOne(
        {
          identifier: payload.aid,
          _environmentId: payload.env,
          _organizationId: payload.org,
        },
        ['_id']
      );

      if (!agent) {
        throw new NotFoundException('Agent referenced by this link no longer exists.');
      }

      const integration = await this.integrationRepository.findOne(
        {
          _id: payload.iid,
          _environmentId: payload.env,
          _organizationId: payload.org,
        },
        '_id providerId'
      );

      if (!integration) {
        throw new NotFoundException('Integration referenced by this link no longer exists.');
      }

      if (integration.providerId !== ChatProviderIdEnum.Slack) {
        throw new BadRequestException('This link is not a Slack setup link.');
      }

      await this.slackQuickSetupUsecase.execute(
        SlackQuickSetupCommand.create({
          userId: SYNTHETIC_USER_ID,
          environmentId: payload.env,
          organizationId: payload.org,
          integrationId: integration._id,
          agentId: agent._id,
          configToken: command.configToken,
        })
      );

      return { success: true };
    } catch (err) {
      try {
        await this.tokenService.release(command.token, claimed);
      } catch (releaseErr) {
        this.logger.error(`Slack setup token rollback failed: ${(releaseErr as Error).message}`);
      }
      this.logger.warn(`Slack setup consume failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private async claimToken(token: string) {
    try {
      return await this.tokenService.claim(token, 'slack-agent-setup');
    } catch (err) {
      if (err instanceof InvalidTelegramMobileTokenError) {
        if (err.reason === 'used') {
          throw new ConflictException({
            code: 'token_already_used',
            message: 'This setup link has already been used. Generate a new one from your dashboard.',
          });
        }

        throw new UnauthorizedException({
          code: err.reason === 'expired' ? 'token_expired' : 'token_invalid',
          message:
            err.reason === 'expired'
              ? 'This setup link has expired. Generate a new one from your dashboard.'
              : 'This setup link is invalid.',
        });
      }

      throw err;
    }
  }
}
