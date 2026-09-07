export interface IEnv {
  WEBSOCKET_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
  INTERNAL_API_KEY: string;
  API_URL?: string;
  REGION?: string;
}

export interface IConnectionMetadata {
  userId: string;
  environmentId: string;
  connectedAt: number;
  jwtToken: string;
  contextKeys: string[];
}

export interface IWebSocketRoom {
  sendToUser(userId: string, event: string, data: unknown, contextKeys: string[]): Promise<void>;
  getActiveConnectionsForUser(userId: string): number;
  getTotalActiveConnections(): number;
  getConnectionCapacity(): { current: number; max: number; available: number };
}
