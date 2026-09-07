export function parsePositiveIntEnv(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export const KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY = parsePositiveIntEnv(
  process.env.KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY,
  15
);

export const KEYLESS_GENERATE_CAP_PER_IP_PER_DAY = parsePositiveIntEnv(
  process.env.KEYLESS_GENERATE_CAP_PER_IP_PER_DAY,
  5
);

export const KEYLESS_MAX_AGENTS_PER_ENV = parsePositiveIntEnv(process.env.KEYLESS_MAX_AGENTS_PER_ENV, 2);

/**
 * How many `@novu/human` interactions a keyless environment may create before
 * delivery is replaced by the sign-up CTA. Read at call time (not module load)
 * so the value can change per process/test without a restart.
 */
export const KEYLESS_HUMAN_INTERACTION_CAP_DEFAULT = 5;

export function resolveKeylessHumanInteractionCap(): number {
  return parsePositiveIntEnv(process.env.KEYLESS_HUMAN_INTERACTION_CAP, KEYLESS_HUMAN_INTERACTION_CAP_DEFAULT);
}

export const KEYLESS_DAILY_COUNTER_TTL_SECONDS = 86_400;

export const INCR_WITH_EXPIRE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;
