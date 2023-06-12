import { IconName } from '@fortawesome/fontawesome-svg-core';
import { INotificationTemplate } from '@novu/shared';

export interface IBlueprintTemplate extends INotificationTemplate {
  iconName: IconName;
}
