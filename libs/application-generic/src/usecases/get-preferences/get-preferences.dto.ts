import { PreferencesTypeEnum, WorkflowPreferences } from '@novu/shared';

export class GetPreferencesResponseDto {
  preferences: WorkflowPreferences;
  type: PreferencesTypeEnum;
  source: Record<PreferencesTypeEnum, WorkflowPreferences | null>;
}
