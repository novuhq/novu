import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class ConsumeSlackSetupLinkCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  token: string;

  @IsDefined()
  @IsString()
  configToken: string;
}
