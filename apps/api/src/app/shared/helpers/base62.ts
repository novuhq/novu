import basex from 'base-x';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const { encode, decode } = basex(BASE62);

export function encodeBase62(value: string): string {
  const buffer = Buffer.from(value, 'hex');

  return encode(buffer);
}

export function decodeBase62(encoded: string): string {
  const uint8Array = decode(encoded);

  return Buffer.from(uint8Array).toString('hex');
}

export function isBase62(input: string): boolean {
  const base62Regex = /^[0-9A-Za-z]+$/;

  return base62Regex.test(input);
}
