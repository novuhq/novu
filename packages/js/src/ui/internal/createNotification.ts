import { InboxService } from '../../api';
import { NovuEventEmitter } from '../../event-emitter';
import { ensureNotificationInstance } from '../../notifications/helpers';
import { Notification } from '../../notifications/notification';
import { InboxNotification } from '../../types';

export function createNotification({
  emitter,
  inboxService,
  notification,
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notification: InboxNotification;
}): Notification {
  return ensureNotificationInstance({
    notification,
    emitter,
    inboxService,
  });
}
