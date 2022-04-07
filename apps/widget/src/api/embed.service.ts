import { IMessage } from '@novu/shared';

export function sendUrlChange(url: string) {
  if (!window.parentIFrame) return;
  window.parentIFrame.sendMessage({
    type: 'url_change',
    url,
  });
}

export function sendNotificationClick(notification: IMessage) {
  if (!window.parentIFrame) return;
  window.parentIFrame.sendMessage({
    type: 'notification_click',
    notification,
  });
}
