import { createHash as createHashCrypto } from 'crypto';

export const createHash = (str: string): string => {
  const hash = createHashCrypto('sha256');
  hash.update(str);

  return hash.digest('hex');
};
