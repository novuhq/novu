import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { CreateWorkflowDto } from '../../dto/create-workflow-dto';
import { UpdateWorkflowDto } from '../../dto/update-workflow-dto';

export class UpsertWorkflowCommand extends EnvironmentWithUserObjectCommand {
  workflowDatabaseIdForUpdate?: string;

  workflowDto: CreateWorkflowDto | UpdateWorkflowDto;
}
