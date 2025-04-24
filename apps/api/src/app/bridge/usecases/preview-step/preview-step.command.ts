import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { JobStatusEnum, WorkflowOriginEnum } from '@novu/shared';
import { SubscriberResponseDtoOptional } from '../../../subscribers/dtos';

export class PreviewStepCommand extends EnvironmentWithUserCommand {
  workflowId: string;
  stepId: string;
  controls: Record<string, unknown>;
  payload: Record<string, unknown>;
  subscriber?: SubscriberResponseDtoOptional;
  workflowOrigin: WorkflowOriginEnum;
  state?: FrameworkPreviousStepsOutputState[];
}
export type FrameworkPreviousStepsOutputState = {
  stepId: string;
  outputs: Record<string, unknown>;
  state: {
    status: JobStatusEnum;
    error?: string;
  };
};
