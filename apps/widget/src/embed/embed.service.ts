import { IMessage, ButtonTypeEnum, WebSocketEventEnum } from '@novu/shared';

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

export function unseenChanged(unseenCount: number) {
  if ('parentIFrame' in window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).parentIFrame.sendMessage({
      type: WebSocketEventEnum.UNSEEN,
      count: unseenCount,
    });
  }
}

export function actionClick(templateIdentifier: string, type: ButtonTypeEnum, notification: IMessage) {
  if ('parentIFrame' in window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).parentIFrame.sendMessage({
      type: 'action_click',
      templateIdentifier,
      resultType: type,
      notification,
    });
  }
}
