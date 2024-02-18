import { IsDefined, IsMongoId, IsNumber } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWorkflowOverridesCommand extends EnvironmentWithUserCommand {
  @IsNumber()
  @IsDefined()
  page: number;

  @IsNumber()
  @IsDefined()
  limit: number;
}
