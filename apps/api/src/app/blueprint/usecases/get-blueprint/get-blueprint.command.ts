import { IsDefined, IsString } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class GetBlueprintCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  templateIdOrIdentifier: string;
}
