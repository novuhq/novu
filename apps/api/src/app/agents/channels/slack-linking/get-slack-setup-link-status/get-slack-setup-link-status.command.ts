import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class GetSlackSetupLinkStatusCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  token: string;
}
