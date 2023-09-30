import { IsDefined, IsArray } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class BulkApplyChangeCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsArray()
  changeIds: string[];
}
