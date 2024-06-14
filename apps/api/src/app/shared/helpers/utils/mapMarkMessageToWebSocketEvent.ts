import { MessagesStatusEnum, WebSocketEventEnum } from '@novu/shared';

export function mapMarkMessageToWebSocketEvent(markAs: MessagesStatusEnum): WebSocketEventEnum | undefined {
  if (markAs === MessagesStatusEnum.READ || markAs === MessagesStatusEnum.UNREAD) {
    return WebSocketEventEnum.UNREAD;
  }

  if (markAs === MessagesStatusEnum.SEEN || markAs === MessagesStatusEnum.UNSEEN) {
    return WebSocketEventEnum.UNSEEN;
  }

  return undefined;
}
