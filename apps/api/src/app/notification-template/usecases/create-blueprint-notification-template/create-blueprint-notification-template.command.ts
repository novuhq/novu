import { IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateBlueprintNotificationTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  templateId: string;
}
