import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase } from '@novu/application-generic';
import { buildHumanDashboardUrl } from '../../../shared/helpers/resolve-human-dashboard-base-url';
import type { CreateHumanInviteResponseDto } from '../../dtos/human-invite.dto';
import { trackAgentInboxContactInvited } from '../../services/agent-inbox-analytics';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import { HumanInviteTokenService, toHttpError } from '../../services/human-invite-token.service';
import { SetupHumanRelayCommand } from '../setup-human-relay/setup-human-relay.command';
import { SetupHumanRelay } from '../setup-human-relay/setup-human-relay.usecase';
import { CreateHumanInviteCommand } from './create-human-invite.command';

/**
 * Behind `human contact invite <id>` without `--via`: mints a link to the invite page
 * on the Human dashboard, where the human connects any of the relay's chat apps
 * and picks their default. The page only ever offers apps the inviter set up.
 */
@Injectable()
export class CreateHumanInvite {
  constructor(
    private readonly setupHumanRelay: SetupHumanRelay,
    private readonly deliveryService: HumanDeliveryService,
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateHumanInviteCommand): Promise<CreateHumanInviteResponseDto> {
    const relay = await this.setupHumanRelay.execute(
      SetupHumanRelayCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        subscriberId: command.subscriberId,
        agentIdentifier: command.agentIdentifier,
        firstName: command.firstName,
        lastName: command.lastName,
        analyticsSource: command.analyticsSource,
      })
    );

    const channels = await this.deliveryService.describeInviteChannels({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: relay.agentId,
      subscriberId: command.subscriberId,
    });

    if (channels.length === 0) {
      throw new NotFoundException(
        'No Telegram, Slack, or Email channel is linked to the relay agent. Run `npx @agentinbox/cli setup` first.'
      );
    }

    let issued: { token: string; expiresAt: string };
    try {
      issued = await this.inviteTokens.issue({
        env: command.environmentId,
        org: command.organizationId,
        agentId: relay.agentId,
        subscriberId: command.subscriberId,
      });
    } catch (err) {
      throw toHttpError(err);
    }

    trackAgentInboxContactInvited(
      this.analyticsService,
      { userId: command.userId, organizationId: command.organizationId },
      { agentId: relay.agentId, source: command.analyticsSource }
    );

    return {
      url: buildHumanDashboardUrl(`/invite/${issued.token}`),
      expiresAt: issued.expiresAt,
      channels: channels.map(({ via, integrationIdentifier, connected }) => ({
        via,
        integrationIdentifier,
        connected,
      })),
    };
  }
}
