export const NOVU_ENCRYPTION_SUB_MASK = 'nvsk.';

export type EncryptedSecret = `${typeof NOVU_ENCRYPTION_SUB_MASK}${string}`;
