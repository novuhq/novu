import { INotificationTemplate } from '@novu/shared';

export class GroupedBlueprint {
  name: string;
  blueprints: INotificationTemplate[];
}

export class GroupedBlueprintResponse {
  general: GroupedBlueprint[];
  popular: GroupedBlueprint;
}
