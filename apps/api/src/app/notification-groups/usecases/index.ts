import { GetNotificationGroups } from './get-notification-groups/get-notification-groups.usecase';
import { CreateNotificationGroup } from './create-notification-group/create-notification-group.usecase';
import { GetNotificationGroup } from './get-notification-group/get-notification-group.usecase';
import { DeleteNotificationGroup } from './delete-notification-group/delete-notification-group.usecase';
import { UpdateNotificationGroup } from './update-notification-group/update-notification-group.usecase';

export const USE_CASES = [
  GetNotificationGroups,
  CreateNotificationGroup,
  GetNotificationGroup,
  DeleteNotificationGroup,
  UpdateNotificationGroup,
];
