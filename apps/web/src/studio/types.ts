type BaseStudioState = {
  testUser: {
    id: string;
    firstName?: string;
    lastName?: string;
    emailAddress: string;
  };
  organizationName?: string;
  devSecretKey?: string;
  anonymousId?: string | null;
};

type CloudStudioState = BaseStudioState & {
  isLocalStudio: false;
  storedBridgeURL: string;
};

type LocalStudioState = BaseStudioState & {
  isLocalStudio: true;
  localBridgeURL: string;
  tunnelBridgeURL: string;
};

export type StudioState = LocalStudioState | CloudStudioState;

/** Current state of connection to Novu Bridge */
export type ConnectionStatus = 'connected' | 'disconnected' | 'loading';

/** Payload from our well-known URI */
export type LocalStudioWellKnownMetadata = {
  port: string;
  route: string;
  dashboardUrl: string;
  studioPort: string;
  origin: string;
  tunnelOrigin: string;
};
