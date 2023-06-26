import { IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteChangeCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  changeId: string;
}
