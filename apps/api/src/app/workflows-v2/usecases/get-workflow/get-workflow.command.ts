import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class GetWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;
}
