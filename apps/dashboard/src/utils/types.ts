export enum BaseEnvironmentEnum {
  DEVELOPMENT = 'Development',
  PRODUCTION = 'Production',
}

export type BridgeStatus = {
  status: 'ok';
  bridgeUrl?: string;
  discovered: {
    workflows: number;
  };
};

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  LOADING = 'loading',
}
