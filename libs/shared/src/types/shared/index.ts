export type CustomDataType = { [key: string]: string | string[] | boolean | number | undefined };

export const NOVU_SUB_MASK = 'nvsk.';

export type EncryptedSecret = `${typeof NOVU_SUB_MASK}${string}`;
