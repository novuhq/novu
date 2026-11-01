import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class GetHumanAgentCardCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  handle: string;
}
