/** The largest on-demand limit of workflow runs an organization can set. */
export const MAX_ON_DEMAND_LIMIT = 1_000_000_000;

/** Opens the usage limits drawer on the billing settings page. */
export const USAGE_LIMITS_DRAWER_PARAM = 'usageLimits';
export const USAGE_LIMITS_DRAWER_OPEN_VALUE = 'open';

/** Dashboard path of the billing settings page with the usage limits drawer open. */
export const USAGE_LIMITS_DASHBOARD_PATH = `/settings/billing?${USAGE_LIMITS_DRAWER_PARAM}=${USAGE_LIMITS_DRAWER_OPEN_VALUE}`;
