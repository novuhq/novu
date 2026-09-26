/**
 * Whether anything is listening for the metrics this deployment records.
 *
 * New Relic is only wired up on the managed service, and OTEL is opt-in, so on
 * community and self-hosted installs every recorded metric goes nowhere. Used
 * to skip the queue-depth collector and its queue entirely rather than run a
 * repeating job whose output is discarded.
 */
export function hasMetricsBackend(): boolean {
  return (
    (process.env.NOVU_MANAGED_SERVICE === 'true' && !!process.env.NEW_RELIC_LICENSE_KEY) ||
    process.env.ENABLE_OTEL === 'true'
  );
}
