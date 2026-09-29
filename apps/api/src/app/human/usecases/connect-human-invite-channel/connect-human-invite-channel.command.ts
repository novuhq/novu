import { BaseCommand } from '@novu/application-generic';
import { HumanChannelViaEnum } from '@novu/shared';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { HumanInviteVia } from '../../services/human-delivery.service';

export class ConnectHumanInviteChannelCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsIn([HumanChannelViaEnum.TELEGRAM, HumanChannelViaEnum.SLACK])
  via: HumanInviteVia;
}
