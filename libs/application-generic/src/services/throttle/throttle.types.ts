export interface IThrottleReservationParams {
  environmentId: string;
  subscriberId: string;
  workflowId: string;
  stepId: string;
  jobId: string;
  windowMs: number;
  limit: number;
  nowMs: number;
  /** Key component used by the legacy-compatible Redis identity. */
  throttleKey?: string;
  /** Optional grouping value applied on top of the subscriber, already resolved from the payload. */
  throttleValue?: string;
}

export interface IThrottleReservationResult {
  granted: boolean;
  count: number;
  ttlMs: number;
  windowStartMs: number;
}

export interface IThrottleReleaseParams {
  environmentId: string;
  subscriberId: string;
  workflowId: string;
  stepId: string;
  jobId: string;
  windowMs: number;
  nowMs: number;
  /** Key component used by the legacy-compatible Redis identity. */
  throttleKey?: string;
  /** Optional grouping value applied on top of the subscriber, already resolved from the payload. */
  throttleValue?: string;
}

export interface IThrottleReleaseResult {
  released: boolean;
  count: number;
  ttlMs: number;
}
