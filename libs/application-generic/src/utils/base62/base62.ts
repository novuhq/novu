import { base } from './base';
import { BASE62_ALPHABET } from './base62-alphabet.const';

const { encode, decode } = base(BASE62_ALPHABET);
const ENCODING = 'hex' satisfies BufferEncoding;

export function encodeBase62(value: string): string {
  const buffer = Buffer.from(value, ENCODING);

  return encode(buffer);
}

export function decodeBase62(encoded: string): string {
  const uint8Array = decode(encoded);

  return Buffer.from(uint8Array).toString(ENCODING);
}
