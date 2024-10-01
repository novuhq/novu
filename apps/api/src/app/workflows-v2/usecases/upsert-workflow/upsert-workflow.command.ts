import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { CreateWorkflowDto } from '@novu/shared/src/dto/workflows/create-workflow-dto';
import { UpdateWorkflowDto } from '@novu/shared/src/dto/workflows/update-workflow-dto';

export class UpsertWorkflowCommand extends EnvironmentWithUserObjectCommand {
  workflowDatabaseIdForUpdate?: string;

  workflowDto: CreateWorkflowDto | UpdateWorkflowDto;
}
