/**
 * `code` is the API's own code when it sends one (`claim_agent_exists`, `cli_login_not_found`, …),
 * otherwise one of these, picked from the HTTP status.
 */
export type HumanApiFallbackCode =
  | 'unauthorized'
  | 'not_found'
  | 'rate_limited'
  | 'request_failed'
  | 'unavailable'
  | 'not_available_yet';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/**
 * The one error every server-side call to the Novu API throws. `message` is safe to show to an operator:
 * the API's own message for a request it turned down, and a generic one for anything else. `request`
 * says which call failed and is for logs only.
 */
export class HumanApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly request?: string
  ) {
    super(message);
    this.name = 'HumanApiError';
  }
}

export function isHumanApiNotFound(error: unknown): boolean {
  return error instanceof HumanApiError && error.status === 404;
}

/** Messages of 4xx responses are written for people; a 5xx one can carry internals, so it's replaced. */
export function toHumanApiError(
  status: number,
  apiCode: string | undefined,
  apiMessage: string | undefined,
  request: string
): HumanApiError {
  const isClientError = status >= 400 && status < 500;

  return new HumanApiError(
    status,
    apiCode ?? fallbackCode(status),
    (isClientError && apiMessage) || GENERIC_MESSAGE,
    request
  );
}

function fallbackCode(status: number): HumanApiFallbackCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 400 && status < 500) return 'request_failed';

  return 'unavailable';
}
