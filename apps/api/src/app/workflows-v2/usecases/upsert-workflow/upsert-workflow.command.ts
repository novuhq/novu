import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { CreateWorkflowDto, UpdateWorkflowDto } from '@novu/shared';

export class UpsertWorkflowCommand extends EnvironmentWithUserObjectCommand {
  identifierOrInternalId?: string;

  workflowDto: CreateWorkflowDto | UpdateWorkflowDto;
}
