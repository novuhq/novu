import { NotificationTemplateEntity } from '@novu/dal';

export class GroupedBlueprintResponse {
  name: string;
  blueprints: NotificationTemplateEntity[];
}
