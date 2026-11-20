import { BaseCommand } from '@novu/application-generic';
import { HumanChannelViaEnum } from '@novu/shared';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { HUMAN_INVITE_VIAS } from '../../dtos/human-invite.dto';
import type { HumanInviteVia } from '../../services/human-delivery.service';

export class ConnectHumanInviteChannelCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsIn(HUMAN_INVITE_VIAS)
  via: HumanInviteVia;

  @ValidateIf((command: ConnectHumanInviteChannelCommand) => command.via === HumanChannelViaEnum.EMAIL)
  @IsEmail()
  @IsNotEmpty()
  address?: string;
}
