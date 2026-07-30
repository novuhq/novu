export enum WebSocketEventEnum {
  RECEIVED = 'notification_received',
  UNREAD = 'unread_count_changed',
  UNSEEN = 'unseen_count_changed',
  /** Agent web-chat live envelope (`AgentEventEnvelope` payload). */
  AGENT_EVENT = 'agent_event',
}
