/** The largest on-demand headroom of workflow runs an organization can set. */
export const MAX_USAGE_LIMIT_HEADROOM = 1_000_000_000;

/** Opens the usage limits drawer on the billing settings page. */
export const USAGE_LIMITS_DRAWER_PARAM = 'usageLimits';
export const USAGE_LIMITS_DRAWER_OPEN_VALUE = 'open';

/** Dashboard path of the billing settings page with the usage limits drawer open. */
export const USAGE_LIMITS_DASHBOARD_PATH = `/settings/billing?${USAGE_LIMITS_DRAWER_PARAM}=${USAGE_LIMITS_DRAWER_OPEN_VALUE}`;
