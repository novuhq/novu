import { ContextResolved } from '@novu/framework/internal';
import { ResourceOriginEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../commands';
import { SubscriberResponseDtoOptional } from '../../dtos/subscribers/subscriber-response.dto';
import { PreviewTopicDto } from '../../dtos/workflow/preview-payload.dto';
import { FrameworkPreviousStepsOutputState } from '../preview/preview.types';

export class PreviewStepCommand extends EnvironmentWithUserCommand {
  workflowId: string;
  stepId: string;
  controls: Record<string, unknown>;
  payload: Record<string, unknown>;
  context?: ContextResolved;
  subscriber?: SubscriberResponseDtoOptional;
  actor?: SubscriberResponseDtoOptional;
  topic?: PreviewTopicDto;
  workflowOrigin: ResourceOriginEnum;
  state?: FrameworkPreviousStepsOutputState[];
  skipLayoutRendering?: boolean;
  layoutId?: string;
  stepResolverHash?: string;
  env?: Record<string, string>;
  /**
   * When set, the preview request is sent to this bridge URL instead of the
   * environment's persisted bridge URL (dashboard local mode / non-persisted workflows).
   */
  statelessBridgeUrl?: string;
  enforceSsrfProtection?: boolean;
}
