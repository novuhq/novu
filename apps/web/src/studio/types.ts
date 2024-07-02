/**
 * @deprecated Temporary type until framework types are available
 */
export type BridgeWorkflowStepType = 'email' | 'in_app' | 'sms' | 'chat' | 'push' | 'digest' | 'delay' | 'custom';

/**
 * @deprecated Temporary type until framework types are available
 */
export interface IBridgeWorkflowStep {
  stepId: string;
  type: BridgeWorkflowStepType;
}

/**
 * @deprecated Temporary type until framework types are available
 */
export interface IBridgeWorkflow {
  workflowId: string;
  code: string;
  steps: IBridgeWorkflowStep[];
}

type BaseStudioState = {
  testUser: {
    id: string;
    firstName?: string;
    lastName?: string;
    emailAddress: string;
  };
  organizationName?: string;
  devSecretKey?: string;
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
