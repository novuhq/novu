import { IVerifyCredentialsResponse, VerifyCredentialsStatusEnum } from '@novu/stateless';

/** Credential checks are interactive (a user clicked "Test connection"), so they get a short cap. */
export const VERIFY_CREDENTIALS_TIMEOUT_MS = 10_000;

export type VerifyCredentialsClassifier = (
  httpStatus: number | undefined,
  error: unknown
) => VerifyCredentialsStatusEnum | undefined;

const INVALID_MESSAGE = 'The provider rejected these credentials.';
const UNREACHABLE_MESSAGE = "Couldn't reach the provider to check these credentials.";
const INCONCLUSIVE_MESSAGE =
  "The provider answered, but these credentials can't be confirmed with a read-only check (the key may be restricted to sending).";

/**
 * Reads the HTTP status off the error shapes our provider SDKs throw:
 * axios (`response.status`), Twilio `RestException` (`status`), Vonage `VetchError` (`response.status` / numeric `code`).
 */
export function getErrorHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const candidate = error as {
    response?: { status?: unknown };
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
  };
  const values = [candidate.response?.status, candidate.status, candidate.statusCode, candidate.code];

  for (const value of values) {
    const status = typeof value === 'string' ? Number(value) : value;

    if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status < 600) {
      return status;
    }
  }

  return undefined;
}

/**
 * Default mapping from an HTTP status to a verification outcome:
 * - 401 → INVALID (the key is unknown or revoked)
 * - no status (timeout / DNS / network), 408, 429, 5xx → UNREACHABLE (transient, retry)
 * - anything else, 403 included → INCONCLUSIVE (an answer we can't interpret)
 */
export function classifyHttpStatus(httpStatus: number | undefined): VerifyCredentialsStatusEnum {
  if (httpStatus === undefined || httpStatus === 408 || httpStatus === 429 || httpStatus >= 500) {
    return VerifyCredentialsStatusEnum.UNREACHABLE;
  }

  if (httpStatus === 401) return VerifyCredentialsStatusEnum.INVALID;

  return VerifyCredentialsStatusEnum.INCONCLUSIVE;
}

export function verifyCredentialsResponse(status: VerifyCredentialsStatusEnum): IVerifyCredentialsResponse {
  switch (status) {
    case VerifyCredentialsStatusEnum.VALID:
      return { status, message: 'The provider accepted these credentials.' };
    case VerifyCredentialsStatusEnum.INVALID:
      return { status, message: INVALID_MESSAGE };
    case VerifyCredentialsStatusEnum.UNREACHABLE:
      return { status, message: UNREACHABLE_MESSAGE };
    default:
      return { status, message: INCONCLUSIVE_MESSAGE };
  }
}

/**
 * Runs a read-only request and turns its outcome into a {@link IVerifyCredentialsResponse}.
 * Messages are fixed strings on purpose: upstream errors can carry request URLs or keys, so they never reach the user.
 * `classify` lets a provider override the default mapping for answers it documents differently (e.g. Telegram's 404);
 * returning `undefined` falls back to the default.
 */
export async function verifyCredentialsWith(
  request: () => Promise<unknown>,
  classify?: VerifyCredentialsClassifier
): Promise<IVerifyCredentialsResponse> {
  try {
    await request();

    return verifyCredentialsResponse(VerifyCredentialsStatusEnum.VALID);
  } catch (error) {
    const httpStatus = getErrorHttpStatus(error);

    return verifyCredentialsResponse(classify?.(httpStatus, error) ?? classifyHttpStatus(httpStatus));
  }
}
