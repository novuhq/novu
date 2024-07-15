import CryptoJS from 'crypto-js';

export const createHash = (message: string) => {
  return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
};
