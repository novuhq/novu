import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '../../commands';

export class GetWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  @IsString()
  @IsOptional()
  environmentId?: string;
}
