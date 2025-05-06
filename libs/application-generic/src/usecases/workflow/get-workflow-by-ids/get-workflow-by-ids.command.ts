import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../commands';

export class GetWorkflowByIdsCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;
}
