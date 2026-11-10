import { BaseCommand } from '@novu/application-generic';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { HUMAN_INVITE_VIAS } from '../../dtos/human-invite.dto';
import type { HumanInviteVia } from '../../services/human-delivery.service';

export class SetHumanInviteDefaultCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsIn(HUMAN_INVITE_VIAS)
  via: HumanInviteVia;
}
