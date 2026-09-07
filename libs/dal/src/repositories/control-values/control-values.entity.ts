import { ControlValuesLevelEnum } from '@novu/shared';

export class ControlValuesEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
  _environmentId: string;
  _organizationId: string;
  level: ControlValuesLevelEnum;
  priority: number;
  controls: Record<string, unknown>;
  _workflowId?: string;
  _stepId?: string;
  _layoutId?: string;
  /** Set only for level=STEP_PROVIDER_CONTROLS docs; identifies the provider the controls belong to. */
  providerId?: string;
}
