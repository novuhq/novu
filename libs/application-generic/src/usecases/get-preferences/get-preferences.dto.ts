import { PreferencesTypeEnum, WorkflowPreferences, WorkflowPreferencesPartial } from '@novu/shared';

export class GetPreferencesResponseDto {
  preferences: WorkflowPreferences;

  type: PreferencesTypeEnum;

  source: {
    [PreferencesTypeEnum.WORKFLOW_RESOURCE]: WorkflowPreferences;
    [PreferencesTypeEnum.USER_WORKFLOW]: WorkflowPreferences | null;
    [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: WorkflowPreferencesPartial | null;
    [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: WorkflowPreferencesPartial | null;
  };
}
