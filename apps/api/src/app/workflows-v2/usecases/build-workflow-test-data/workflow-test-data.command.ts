import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';

export class WorkflowTestDataCommand extends EnvironmentWithUserObjectCommand {
  workflowIdOrInternalId: string;
}
