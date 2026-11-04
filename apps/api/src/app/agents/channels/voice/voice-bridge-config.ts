import { timingSafeEqual } from 'node:crypto';

/** Default park bound — under ElevenLabs' max cascade_timeout_seconds of 15. */
export const VOICE_BRIDGE_DEFAULT_PARK_MS = 12_000;

export const VOICE_BRIDGE_KEEPALIVE_MS = 2_000;

/** How often a parked bridge checks Redis for the agent's line. */
export const VOICE_BRIDGE_CLAIM_POLL_MS = 250;

export function voiceBridgeParkMs(): number {
  const raw = process.env.NOVU_VOICE_BRIDGE_PARK_MS?.trim();
  if (!raw) {
    return VOICE_BRIDGE_DEFAULT_PARK_MS;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1_000) {
    return VOICE_BRIDGE_DEFAULT_PARK_MS;
  }

  return Math.floor(parsed);
}

export function voiceBridgeSecret(): string | undefined {
  return process.env.NOVU_VOICE_BRIDGE_SECRET?.trim() || undefined;
}

export function verifyVoiceBridgeBearer(authorization: string | undefined): boolean {
  const expected = voiceBridgeSecret();
  if (!expected) {
    return false;
  }

  const token = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const given = Buffer.from(token);
  const actual = Buffer.from(expected);
  if (given.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(given, actual);
}
