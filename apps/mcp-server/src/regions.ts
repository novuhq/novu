/** The dashboard of each `NOVU_REGION`, for the links tools hand back. */
export const REGION_DASHBOARD_URLS: Record<string, string> = {
	eu: "https://eu.dashboard.novu.co",
	staging: "https://dashboard.novu-staging.co",
	us: "https://dashboard.novu.co",
};

/** Regional MCP endpoints — keep in sync with `wrangler.jsonc` routes. */
export const REGION_HOSTS: Record<string, string> = {
	eu: "https://eu.mcp.novu.co/",
	us: "https://mcp.novu.co/",
};
