import { BaseCommand } from '@novu/application-generic';
import { HumanChannelViaEnum } from '@novu/shared';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import type { HumanInviteVia } from '../../services/human-delivery.service';

export class ConnectHumanInviteChannelCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsIn([HumanChannelViaEnum.TELEGRAM, HumanChannelViaEnum.SLACK, HumanChannelViaEnum.EMAIL])
  via: HumanInviteVia;

  @ValidateIf((command: ConnectHumanInviteChannelCommand) => command.via === HumanChannelViaEnum.EMAIL)
  @IsEmail()
  @IsNotEmpty()
  address?: string;
}
