import type { EnvironmentEntity } from '@novu/dal';

export enum ClaimLinkErrorCodeEnum {
  USED = 'claim_link_used',
  EXPIRED = 'claim_link_expired',
  INVALID = 'claim_link_invalid',
  REQUIRES_ENVIRONMENT_CLAIM = 'claim_link_requires_environment_claim',
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
  /**
   * Runs after every preflight and before the move transaction. Throwing aborts the claim without consuming the token.
   * Required for agent keyless environments, whose claim must also copy workflows and revoke the API key.
   */
  beforeMove?: (context: ClaimKeylessConnectBeforeMoveContext) => Promise<ClaimKeylessConnectMoveOptions | undefined>;
  /** Runs once the move transaction committed: later failures (token consumption, lock release) must not undo it. */
  onMoveCommitted?: () => void;
}
