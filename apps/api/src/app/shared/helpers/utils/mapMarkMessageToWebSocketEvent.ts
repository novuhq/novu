import { MarkMessagesAsEnum, WebSocketEventEnum } from '@novu/shared';

export function mapMarkMessageToWebSocketEvent(markAs: MarkMessagesAsEnum): WebSocketEventEnum | undefined {
  if (markAs === MarkMessagesAsEnum.READ || markAs === MarkMessagesAsEnum.UNREAD) {
    return WebSocketEventEnum.UNREAD;
  }

  if (markAs === MarkMessagesAsEnum.SEEN || markAs === MarkMessagesAsEnum.UNSEEN) {
    return WebSocketEventEnum.UNSEEN;
  }

  return undefined;
}
