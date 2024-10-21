import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { Subscriber } from '@novu/framework';

export class PreviewStepCommand extends EnvironmentWithUserCommand {
  workflowId: string;
  stepId: string;
  controls: Record<string, unknown>;
  payload: Record<string, unknown>;
  subscriber?: Subscriber;
}
