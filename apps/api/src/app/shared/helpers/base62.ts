import basex from 'base-x';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const { encode, decode } = basex(BASE62);

export function encodeBase62(input: string): string {
  return encode(Buffer.from(input));
}

export function decodeBase62(encoded: string): string {
  const decoded = decode(encoded);

  return Buffer.from(decoded).toString();
}

export function isBase62(input: string): boolean {
  const base62Regex = /^[0-9A-Za-z]+$/;

  return base62Regex.test(input);
}
