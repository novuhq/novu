import { IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ApplyChangeCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  changeId: string;
}
