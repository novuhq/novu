import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class GetBlueprintCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  templateIdOrIdentifier: string;
}
