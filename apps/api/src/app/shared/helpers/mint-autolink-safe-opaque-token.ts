import { customAlphabet } from 'nanoid';

/**
 * Alphanumeric-only alphabet [A-Za-z0-9]. Excludes `-`, `_`, and every GFM
 * trailing-punctuation character, so bare claim URLs autolink fully in chat
 * clients (Cursor, Claude Code, etc.) without losing the final character.
 */
const AUTOLINK_SAFE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const TOKEN_LENGTH = 32;

/**
 * Mint a 32-char opaque token using only [A-Za-z0-9].
 *
 * Backed by nanoid's `customAlphabet`, which draws from a CSPRNG with
 * rejection sampling (no modulo bias). Each character is uniform over 62
 * symbols → ~190.5 bits of entropy (62^32), matching the previous 24-byte
 * base64url scheme while staying autolink-safe.
 */
export const mintAutolinkSafeOpaqueToken = customAlphabet(AUTOLINK_SAFE_ALPHABET, TOKEN_LENGTH);
