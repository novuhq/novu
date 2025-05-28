import { customAlphabet } from 'nanoid';

export const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(ALPHABET);

export function shortId(length = 4) {
  return nanoid(length);
}
