import { BaseCommand } from '@novu/application-generic';
import { OrganizationEntity } from '@novu/dal';
import type { ContextResolved } from '@novu/framework/internal';
import { LAYOUT_CONTENT_VARIABLE } from '@novu/shared';

export class RenderCommand extends BaseCommand {
  controlValues: Record<string, unknown>;
  fullPayloadForRender: FullPayloadForRender;
  organization?: OrganizationEntity;
}
export class FullPayloadForRender {
  workflow?: Record<string, unknown>;
  subscriber: Record<string, unknown>;
  payload: Record<string, unknown>;
  context?: ContextResolved;
  steps: Record<string, unknown>; // step.stepId.unknown
  env?: Record<string, string>;
  // this variable is used to pass the layout content to the renderer
  [LAYOUT_CONTENT_VARIABLE]?: string;
}
