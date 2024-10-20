import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class PreviewStepCommand extends EnvironmentWithUserCommand {
  workflowId: string;
  stepId: string;
  controls: Record<string, unknown>;
  payload: Record<string, unknown>;
}
