export interface IEnv {
  WEBSOCKET_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
  INTERNAL_API_KEY: string;
}

export interface IConnectionMetadata {
  subscriberId: string | null;
  userId: string;
  organizationId: string;
  environmentId: string;
  connectedAt: number;
}

export interface IWebSocketRoom {
  sendToUser(userId: string, event: string, data: any): Promise<void>;
  broadcast(event: string, data: any, excludeUserId?: string): Promise<void>;
  getActiveConnectionsForUser(userId: string): number;
  getConnectedUsers(): string[];
}
