import { IconName } from '@fortawesome/fontawesome-svg-core';
import { IBlueprint } from '@novu/shared';

export interface IBlueprintTemplate extends IBlueprint {
  iconName: IconName;
}
