import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { CreateWorkflowDto, UpdateWorkflowDto } from '@novu/shared-internal';

export class UpsertWorkflowCommand extends EnvironmentWithUserObjectCommand {
  workflowDatabaseIdForUpdate?: string;

  workflowDto: CreateWorkflowDto | UpdateWorkflowDto;
}
