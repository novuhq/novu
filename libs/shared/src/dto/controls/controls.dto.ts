import { ControlVariablesLevelEnum } from '../../types';

export type ControlsDto = Record<ControlVariablesLevelEnum, Control[]>;
type Control = { stepId: string } & Record<string, unknown>;
