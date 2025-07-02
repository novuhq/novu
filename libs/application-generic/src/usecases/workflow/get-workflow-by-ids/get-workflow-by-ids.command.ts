import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../commands';

export class GetWorkflowByIdsCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  workflowIdOrInternalId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
