import type { EnvironmentEntity } from '@novu/dal';

export enum ClaimLinkErrorCodeEnum {
  USED = 'claim_link_used',
  EXPIRED = 'claim_link_expired',
  INVALID = 'claim_link_invalid',
}

export interface ClaimKeylessConnectBeforeMoveContext {
  keylessEnvironment: EnvironmentEntity;
  targetEnvironment: EnvironmentEntity;
}

export interface ClaimKeylessConnectMoveOptions {
  excludeIntegrationProviderIds?: string[];
  revokeKeylessApiKeys?: boolean;
}

export interface ClaimKeylessConnectHooks {
  /** Runs after every preflight and before the move transaction. Throwing aborts the claim without consuming the token. */
  beforeMove?: (context: ClaimKeylessConnectBeforeMoveContext) => Promise<ClaimKeylessConnectMoveOptions | undefined>;
}
