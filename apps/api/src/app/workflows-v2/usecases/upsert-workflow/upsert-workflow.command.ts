import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { CreateWorkflowDto, IdentifierOrInternalId, UpsertWorkflowDto } from '@novu/shared';

export class UpsertWorkflowCommand extends EnvironmentWithUserObjectCommand {
  identifierOrInternalId?: IdentifierOrInternalId;

  workflowDto: CreateWorkflowDto | UpsertWorkflowDto;
}
