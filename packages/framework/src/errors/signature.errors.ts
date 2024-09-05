import { ErrorCodeEnum, HttpHeaderKeysEnum, SIGNATURE_TIMESTAMP_TOLERANCE_MINUTES } from '../constants';
import { UnauthorizedError } from './base.errors';

export class SignatureMismatchError extends UnauthorizedError {
  code = ErrorCodeEnum.SIGNATURE_MISMATCH_ERROR;

  constructor() {
    super(
      `Signature does not match the expected signature. Please ensure the signature provided in the \`${HttpHeaderKeysEnum.NOVU_SIGNATURE}\` header is correct and try again.`
    );
  }
}

export class SignatureNotFoundError extends UnauthorizedError {
  code = ErrorCodeEnum.SIGNATURE_NOT_FOUND_ERROR;

  constructor() {
    super(`Signature not found. Please provide a signature in the \`${HttpHeaderKeysEnum.NOVU_SIGNATURE}\` header`);
  }
}

export class SignatureInvalidError extends UnauthorizedError {
  code = ErrorCodeEnum.SIGNATURE_INVALID_ERROR;

  constructor() {
    super(
      `Signature is invalid. Please provide a valid signature in the \`${HttpHeaderKeysEnum.NOVU_SIGNATURE}\` header`
    );
  }
}

export class SignatureExpiredError extends UnauthorizedError {
  code = ErrorCodeEnum.SIGNATURE_EXPIRED_ERROR;

  constructor() {
    super(
      `Signature expired. Please provide a signature with a timestamp no older than ${SIGNATURE_TIMESTAMP_TOLERANCE_MINUTES} minutes in the \`${HttpHeaderKeysEnum.NOVU_SIGNATURE}\` header`
    );
  }
}

export class SigningKeyNotFoundError extends UnauthorizedError {
  code = ErrorCodeEnum.SIGNING_KEY_NOT_FOUND_ERROR;

  constructor() {
    super('Signature key not found. Please provide a valid key in the Client constructor `config.secretKey`');
  }
}

export class SignatureVersionInvalidError extends UnauthorizedError {
  code = ErrorCodeEnum.SIGNATURE_VERSION_INVALID_ERROR;

  constructor() {
    super(
      `Signature version is invalid. Please provide a signature version with version \`v1\` in the \`${HttpHeaderKeysEnum.NOVU_SIGNATURE}\` header`
    );
  }
}
