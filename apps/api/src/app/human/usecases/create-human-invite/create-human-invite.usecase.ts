import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { resolveHumanWebsiteBaseUrl } from '../../../shared/helpers/resolve-human-website-base-url';
import type { CreateHumanInviteResponseDto } from '../../dtos/human-invite.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import { HumanInviteTokenService, toHttpError } from '../../services/human-invite-token.service';
import { SetupHumanRelayCommand } from '../setup-human-relay/setup-human-relay.command';
import { SetupHumanRelay } from '../setup-human-relay/setup-human-relay.usecase';
import { CreateHumanInviteCommand } from './create-human-invite.command';

/**
 * Behind `human invite <id>` without `--via`: mints a link to the invite page
 * on the Human website, where the human connects any of the relay's chat apps
 * and picks their default. The page only ever offers apps the inviter set up.
 */
@Injectable()
export class CreateHumanInvite {
  constructor(
    private readonly setupHumanRelay: SetupHumanRelay,
    private readonly deliveryService: HumanDeliveryService,
    private readonly inviteTokens: HumanInviteTokenService
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
        'No Telegram or Slack channel is linked to the relay agent. Run `human setup telegram` or `human setup slack` first.'
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

    return {
      url: buildInviteUrl(issued.token),
      expiresAt: issued.expiresAt,
      channels: channels.map(({ via, integrationIdentifier, connected }) => ({
        via,
        integrationIdentifier,
        connected,
      })),
    };
  }
}

/**
 * The Human website is one site for every region, so links from an EU
 * deployment carry `region=eu` and the page calls the EU API. Every AWS EU
 * region starts with `eu-`.
 */
function buildInviteUrl(token: string): string {
  const url = `${resolveHumanWebsiteBaseUrl()}/invite/${token}`;

  return process.env.NOVU_REGION?.startsWith('eu-') ? `${url}?region=eu` : url;
}
