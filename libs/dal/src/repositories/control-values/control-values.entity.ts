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
  /** Set only for STEP_PROVIDER_CONTROLS and STEP_INTEGRATION_CONTROLS docs; identifies the provider the controls belong to. */
  providerId?: string;
  /** Set only for STEP_INTEGRATION_CONTROLS docs; the identifier of the integration the controls override. */
  integrationIdentifier?: string;
}
