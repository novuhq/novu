import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { ContextResolved } from '@novu/framework/internal';
import { JobStatusEnum, ResourceOriginEnum } from '@novu/shared';
import { SubscriberResponseDtoOptional } from '../../../subscribers/dtos';

export class PreviewStepCommand extends EnvironmentWithUserCommand {
  workflowId: string;
  stepId: string;
  controls: Record<string, unknown>;
  payload: Record<string, unknown>;
  context?: ContextResolved;
  subscriber?: SubscriberResponseDtoOptional;
  workflowOrigin: ResourceOriginEnum;
  state?: FrameworkPreviousStepsOutputState[];
  skipLayoutRendering?: boolean;
  layoutId?: string;
}
export type FrameworkPreviousStepsOutputState = {
  stepId: string;
  outputs: Record<string, unknown>;
  state: {
    status: JobStatusEnum;
    error?: string;
  };
};
