export enum ErrorCodesEnum {
  DUPLICATE_KEY = 11000,
}

/**
 * Type guard for MongoDB duplicate-key errors (E11000). Every Mongoose write
 * path wraps the native driver error so `.code === 11000` is the canonical
 * sentinel for any unique-index conflict.
 */
export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === ErrorCodesEnum.DUPLICATE_KEY
  );
}
