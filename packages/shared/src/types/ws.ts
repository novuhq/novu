export enum WebSocketEventEnum {
  RECEIVED = 'notification_received',
  UNREAD = 'unread_count_changed',
  UNSEEN = 'unseen_count_changed',
  /** Live agent `AgentEventEnvelope` fan-out over the shared WS bus. */
  AGENT_EVENT = 'agent_event',
}
