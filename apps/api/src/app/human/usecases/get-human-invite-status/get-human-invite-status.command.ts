import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class GetHumanInviteStatusCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  token: string;
}
