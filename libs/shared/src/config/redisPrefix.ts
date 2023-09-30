export function getRedisPrefix(): string {
  let redisPrefix = '';

  if (process.env.REDIS_PREFIX) {
    redisPrefix = process.env.REDIS_PREFIX;
  }

  return redisPrefix;
}
