import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class StoreControlVariablesCommand extends EnvironmentWithUserCommand {
  stepId: string;
  workflowId: string;
  variables: Record<string, any>;
}
