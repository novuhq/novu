export type EvaluateApiRateLimitResponseDto = {
  /**
   * Whether the request may pass(true) or exceeded the limit(false)
   */
  success: boolean;
  /**
   * Maximum number of requests allowed within a window.
   */
  limit: number;
  /**
   * How many requests the client has left within the current window.
   */
  remaining: number;
  /**
   * Unix timestamp in milliseconds when the limits are reset.
   */
  reset: number;
  /**
   * The duration of the window in seconds.
   */
  windowDuration: number;
  /**
   * The maximum number of requests allowed within a window, including the burst allowance.
   */
  burstLimit: number;
  /**
   * The number of requests that will be refilled per window.
   */
  refillRate: number;
  /**
   * The name of the algorithm used to calculate the rate limit.
   */
  algorithm: string;
  /**
   * The cost of the request.
   */
  cost: number;
  /**
   * The API service level used to evaluate the request.
   */
  apiServiceLevel: string;
};
