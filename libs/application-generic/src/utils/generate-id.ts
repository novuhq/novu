import { customAlphabet } from 'nanoid';
import { generateTimestampHex } from './timestamp-hex';

export const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(ALPHABET);

export function shortId(length = 4) {
  return nanoid(length);
}

export function generateObjectId() {
  return `${generateTimestampHex()}${shortId(12)}`;
}
