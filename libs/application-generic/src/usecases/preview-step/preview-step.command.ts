import { ContextResolved } from '@novu/framework/internal';
import { ResourceOriginEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../commands';
import { SubscriberResponseDtoOptional } from '../../dtos/subscribers/subscriber-response.dto';
import { FrameworkPreviousStepsOutputState } from '../preview/preview.types';

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
  stepResolverHash?: string;
  env?: Record<string, string>;
}
