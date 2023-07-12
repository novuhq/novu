export const TTL_EXPIRE_AFTER_AMOUNT = '48h';

export const TTL_INDEX_ENABLED = !(process.env.NOVU_MANAGED_SERVICE === 'true' || process.env.DISABLE_TTL === 'true');

export function getTTLOptions() {
  if (TTL_INDEX_ENABLED) {
    return { expires: TTL_EXPIRE_AFTER_AMOUNT };
  }
}
