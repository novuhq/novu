export const NOVU_ENCRYPTION_SUB_MASK = 'nvsk.';

export type EncryptedSecret = `${typeof NOVU_ENCRYPTION_SUB_MASK}${string}`;

/**
 * Public placeholder returned in API responses in place of secret values.
 * Used by both the API (when serializing secret variables) and the dashboard
 * (when rendering / detecting unchanged values in forms).
 */
export const SECRET_MASK = '••••••••';
