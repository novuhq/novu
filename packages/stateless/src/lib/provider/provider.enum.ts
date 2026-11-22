export enum CheckIntegrationResponseEnum {
  INVALID_EMAIL = 'invalid_email',
  BAD_CREDENTIALS = 'bad_credentials',
  SUCCESS = 'success',
  FAILED = 'failed',
}

/**
 * Outcome of a provider's read-only credentials check (`verifyCredentials`).
 * - VALID: the provider accepted the credentials.
 * - INVALID: the provider definitively rejected them (e.g. 401, unknown key).
 * - UNREACHABLE: a transient failure (timeout, network, 429, 5xx) — worth retrying, never conclusive.
 * - INCONCLUSIVE: the provider answered but the answer doesn't prove validity either way (e.g. 403 on a least-privilege key).
 */
export enum VerifyCredentialsStatusEnum {
  VALID = 'valid',
  INVALID = 'invalid',
  UNREACHABLE = 'unreachable',
  INCONCLUSIVE = 'inconclusive',
}
