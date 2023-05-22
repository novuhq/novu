import { IsDefined, IsMongoId } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class GetBlueprintCommand extends BaseCommand {
  @IsDefined()
  @IsMongoId()
  templateId: string;
}
