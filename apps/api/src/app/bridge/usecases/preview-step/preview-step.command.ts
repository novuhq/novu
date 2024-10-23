import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { Subscriber } from '@novu/framework/internal';
import { WorkflowOriginEnum } from '@novu/shared';

export class PreviewStepCommand extends EnvironmentWithUserCommand {
  workflowId: string;
  stepId: string;
  controls: Record<string, unknown>;
  payload: Record<string, unknown>;
  subscriber?: Subscriber;
  workflowOrigin: WorkflowOriginEnum;
}
