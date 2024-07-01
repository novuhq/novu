import { ControlVariablesLevelEnum } from '../../types';

export type ControlsDto = {
  [K in ControlVariablesLevelEnum]?: StepControl;
};
type StepControl = Record<stepId, Data>;
type stepId = string;
type Data = Record<string, unknown>;
