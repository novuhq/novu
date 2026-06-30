/**
 * The required format for a boolean flag key.
 */

export type BooleanFlagKey = `IS_${Uppercase<string>}_ENABLED` | `IS_${Uppercase<string>}_DISABLED`;
export type NumericFlagKey = `${Uppercase<string>}_NUMBER`;

export type FlagKey = BooleanFlagKey | NumericFlagKey;

export type FlagType<T> = T extends BooleanFlagKey ? boolean : T extends NumericFlagKey ? number : never;

/**
 * Helper function to test that enum keys and values match correct format.
 *
 * It is not possible as of Typescript 5.2 to declare a type for an enum key or value in-line.
 * Therefore, we must test the enum via a helper function that abstracts the enum to an object.
 *
 * If the test fails, you should review your `enum` to verify that both the
 * keys and values match the format specified by the `FlagKey` template literal type.
 * ref: https://stackoverflow.com/a/58181315
 *
 * @param testEnum - the Enum to type check
 */
export function testFlagEnumValidity<TEnum extends IFlags, IFlags = Record<FlagKey, FlagKey>>(
  _: TEnum & Record<Exclude<keyof TEnum, keyof IFlags>, ['Key must follow `FlagKey` format']>
) {}

export enum FeatureFlagsKeysEnum {
  // Boolean flags
  IS_API_IDEMPOTENCY_ENABLED = 'IS_API_IDEMPOTENCY_ENABLED',
  IS_API_RATE_LIMITING_DRY_RUN_ENABLED = 'IS_API_RATE_LIMITING_DRY_RUN_ENABLED',
  IS_API_RATE_LIMITING_KEYLESS_DRY_RUN_ENABLED = 'IS_API_RATE_LIMITING_KEYLESS_DRY_RUN_ENABLED',
  IS_API_RATE_LIMITING_ENABLED = 'IS_API_RATE_LIMITING_ENABLED',
  IS_CLOUDFLARE_SOCKETS_ENABLED = 'IS_CLOUDFLARE_SOCKETS_ENABLED',
  IS_LEGACY_WS_SERVICE_DISABLED = 'IS_LEGACY_WS_SERVICE_DISABLED',
  IS_EMAIL_INLINE_CSS_DISABLED = 'IS_EMAIL_INLINE_CSS_DISABLED',
  IS_EVENT_QUOTA_THROTTLER_ENABLED = 'IS_EVENT_QUOTA_THROTTLER_ENABLED',
  IS_NEW_MESSAGES_API_RESPONSE_ENABLED = 'IS_NEW_MESSAGES_API_RESPONSE_ENABLED',
  IS_USAGE_ALERTS_ENABLED = 'IS_USAGE_ALERTS_ENABLED',
  IS_USE_MERGED_DIGEST_ID_ENABLED = 'IS_USE_MERGED_DIGEST_ID_ENABLED',
  IS_V2_ENABLED = 'IS_V2_ENABLED',

  IS_WORKFLOW_NODE_PREVIEW_ENABLED = 'IS_WORKFLOW_NODE_PREVIEW_ENABLED',
  IS_WEBHOOKS_MANAGEMENT_ENABLED = 'IS_WEBHOOKS_MANAGEMENT_ENABLED',
  IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED = 'IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED',
  IS_KEYLESS_AGENT_AI_ENABLED = 'IS_KEYLESS_AGENT_AI_ENABLED',
  /** When enabled, API-key auth on GET /v1/environments returns decrypted apiKeys for every environment in the org (pre-NV-7641 opt-in behavior). */
  IS_LIST_ENVIRONMENTS_API_KEYS_ENABLED = 'IS_LIST_ENVIRONMENTS_API_KEYS_ENABLED',
  IS_TEST_PROVIDER_LIMITS_ENABLED = 'IS_TEST_PROVIDER_LIMITS_ENABLED',
  IS_2025_Q1_LEGACY_TIERING_MIGRATION = 'IS_2025_Q1_LEGACY_TIERING_MIGRATION',
  IS_SUBSCRIBER_ID_VALIDATION_DRY_RUN_ENABLED = 'IS_SUBSCRIBER_ID_VALIDATION_DRY_RUN_ENABLED',
  IS_TOPIC_KEYS_VALIDATION_DRY_RUN_ENABLED = 'IS_TOPIC_KEYS_VALIDATION_DRY_RUN_ENABLED',
  IS_RBAC_ENABLED = 'IS_RBAC_ENABLED',
  IS_HTTP_LOGS_PAGE_ENABLED = 'IS_HTTP_LOGS_PAGE_ENABLED',
  IS_INBOUND_LOGS_ENABLED = 'IS_INBOUND_LOGS_ENABLED',
  IS_TRACE_LOGS_ENABLED = 'IS_TRACE_LOGS_ENABLED',
  IS_TRACE_LOGS_READ_ENABLED = 'IS_TRACE_LOGS_READ_ENABLED',
  IS_INBOUND_WEBHOOKS_ENABLED = 'IS_INBOUND_WEBHOOKS_ENABLED',
  IS_INBOUND_WEBHOOKS_CONFIGURATION_ENABLED = 'IS_INBOUND_WEBHOOKS_CONFIGURATION_ENABLED',
  IS_STEP_RUN_LOGS_READ_ENABLED = 'IS_STEP_RUN_LOGS_READ_ENABLED',
  IS_STEP_RUN_LOGS_WRITE_ENABLED = 'IS_STEP_RUN_LOGS_WRITE_ENABLED',
  IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED = 'IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED',
  IS_WORKFLOW_RUN_LOGS_READ_ENABLED = 'IS_WORKFLOW_RUN_LOGS_READ_ENABLED',
  IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED = 'IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED',
  IS_WORKFLOW_RUN_PAGE_MIGRATION_ENABLED = 'IS_WORKFLOW_RUN_PAGE_MIGRATION_ENABLED',
  IS_WORKFLOW_RUN_COUNT_ENABLED = 'IS_WORKFLOW_RUN_COUNT_ENABLED',
  IS_DELIVERY_LIFECYCLE_TRANSITION_ENABLED = 'IS_DELIVERY_LIFECYCLE_TRANSITION_ENABLED',
  IS_EXECUTION_DETAILS_CLICKHOUSE_ONLY_ENABLED = 'IS_EXECUTION_DETAILS_CLICKHOUSE_ONLY_ENABLED',
  IS_GET_PREFERENCES_DISABLED = 'IS_GET_PREFERENCES_DISABLED',
  IS_REGION_SELECTOR_ENABLED = 'IS_REGION_SELECTOR_ENABLED',
  IS_PUSH_UNREAD_COUNT_ENABLED = 'IS_PUSH_UNREAD_COUNT_ENABLED',
  IS_EXPIRED_TOKENS_REMOVAL_ENABLED = 'IS_EXPIRED_TOKENS_REMOVAL_ENABLED',
  IS_ANALYTICS_WORKFLOW_FILTER_ENABLED = 'IS_ANALYTICS_WORKFLOW_FILTER_ENABLED',
  IS_CONTEXTUAL_HELP_DRAWER_ENABLED = 'IS_CONTEXTUAL_HELP_DRAWER_ENABLED',
  IS_SUBSCRIPTION_PREFERENCES_ENABLED = 'IS_SUBSCRIPTION_PREFERENCES_ENABLED',
  IS_LRU_CACHE_ENABLED = 'IS_LRU_CACHE_ENABLED',
  IS_CONTEXT_PREFERENCES_ENABLED = 'IS_CONTEXT_PREFERENCES_ENABLED',
  /** When true, integration lookup may match across environments in the same organization (opt-in for regressed customers). Default is false (environment-scoped). */
  IS_CROSS_ENVIRONMENT_INTEGRATION_ENABLED = 'IS_CROSS_ENVIRONMENT_INTEGRATION_ENABLED',
  IS_PREFERENCE_FETCH_OPTIMIZATION_ENABLED = 'IS_PREFERENCE_FETCH_OPTIMIZATION_ENABLED',
  IS_BILLING_USAGE_CLICKHOUSE_ENABLED = 'IS_BILLING_USAGE_CLICKHOUSE_ENABLED',
  IS_BILLING_USAGE_CLICKHOUSE_SHADOW_ENABLED = 'IS_BILLING_USAGE_CLICKHOUSE_SHADOW_ENABLED',
  IS_BILLING_USAGE_DETAILED_DIAGNOSTICS_ENABLED = 'IS_BILLING_USAGE_DETAILED_DIAGNOSTICS_ENABLED',
  IS_AI_WORKFLOW_GENERATION_ENABLED = 'IS_AI_WORKFLOW_GENERATION_ENABLED',
  /** Enable the Novu Wizard LLM Gateway (`POST /v2/llm/messages`) for an organization. Enterprise-only. */
  IS_LLM_GATEWAY_ENABLED = 'IS_LLM_GATEWAY_ENABLED',
  IS_CLICKHOUSE_BATCHING_ENABLED = 'IS_CLICKHOUSE_BATCHING_ENABLED',
  IS_ORG_KILLSWITCH_FLAG_ENABLED = 'IS_ORG_KILLSWITCH_FLAG_ENABLED',
  IS_USAGE_REPORT_ENABLED = 'IS_USAGE_REPORT_ENABLED',
  IS_USAGE_REPORT_DELAY_ENABLED = 'IS_USAGE_REPORT_DELAY_ENABLED',
  IS_STEP_RESOLVER_ENABLED = 'IS_STEP_RESOLVER_ENABLED',
  IS_ACTION_STEP_RESOLVER_ENABLED = 'IS_ACTION_STEP_RESOLVER_ENABLED',
  /** Enable conversational Agents UI in the dashboard; create the boolean in LaunchDarkly for cloud, or set `VITE_IS_CONVERSATIONAL_AGENTS_ENABLED` when self-hosted. */
  IS_CONVERSATIONAL_AGENTS_ENABLED = 'IS_CONVERSATIONAL_AGENTS_ENABLED',
  /** Enable managed-runtime mode for Agents (e.g. Claude Platform). Create the boolean in LaunchDarkly for cloud, or set `VITE_IS_MANAGED_AGENT_RUNTIME_ENABLED` when self-hosted. */
  IS_MANAGED_AGENT_RUNTIME_ENABLED = 'IS_MANAGED_AGENT_RUNTIME_ENABLED',
  /** Enable Novu-managed demo Claude provider auto-provisioned on dev environments. Create the boolean in LaunchDarkly for cloud, or set `VITE_IS_DEMO_MANAGED_CLAUDE_ENABLED` when self-hosted. */
  IS_DEMO_MANAGED_CLAUDE_ENABLED = 'IS_DEMO_MANAGED_CLAUDE_ENABLED',
  /** Enable the "What's next" section on the agent overview. Create the boolean in LaunchDarkly for cloud, or set `VITE_IS_AGENT_WHATS_NEXT_ENABLED` when self-hosted. */
  IS_AGENT_WHATS_NEXT_ENABLED = 'IS_AGENT_WHATS_NEXT_ENABLED',
  /** Enable the MS Teams subscriber-rollout "What's next" guide (distribute the bot + connect end users) and its post-connect "Continue" CTA. When off, MS Teams shows the generic continue note and hides the rollout guide. Create the boolean in LaunchDarkly for cloud, or set `VITE_IS_AGENT_MSTEAMS_WHATS_NEXT_ENABLED` when self-hosted. */
  IS_AGENT_MSTEAMS_WHATS_NEXT_ENABLED = 'IS_AGENT_MSTEAMS_WHATS_NEXT_ENABLED',
  /** Enable Microsoft Teams Quick Setup in the dashboard; create the boolean in LaunchDarkly for cloud, or set `VITE_IS_MSTEAMS_QUICK_SETUP_ENABLED` when self-hosted. */
  IS_MSTEAMS_QUICK_SETUP_ENABLED = 'IS_MSTEAMS_QUICK_SETUP_ENABLED',
  /** Enable Slack Quick Setup in the dashboard; create the boolean in LaunchDarkly for cloud, or set `VITE_IS_SLACK_QUICK_SETUP_ENABLED` when self-hosted. */
  IS_SLACK_QUICK_SETUP_ENABLED = 'IS_SLACK_QUICK_SETUP_ENABLED',
  /** Enable the Domains management page in the dashboard. */
  IS_DOMAINS_PAGE_ENABLED = 'IS_DOMAINS_PAGE_ENABLED',
  /** Enable Domain Connect auto-configuration for inbound email domains. */
  IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED = 'IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED',
  /**
   * Enable MCP connections that use Novu's pre-registered OAuth app
   * (`auth mode = 'novu-app'`). Gates both `EnableAgentMcpServer` for any
   * catalog entry whose `oauth.mode === 'novu-app'` and `GenerateMcpOAuthUrl`
   * when it resolves to the novu-app branch. DCR connections are never gated
   * by this flag.
   */
  IS_MCP_NOVU_APP_ENABLED = 'IS_MCP_NOVU_APP_ENABLED',
  /**
   * Enable MCP connections where OAuth is fully delegated to the managed
   * agent runtime provider (`auth mode = 'provider-managed'`). Gates the
   * "Add from Claude" flow in the dashboard and the
   * `POST .../mcp-servers/:mcpId/provider-vault` endpoint. When off,
   * provider-managed catalog rows still appear in the picker but the Add
   * button is disabled.
   */
  IS_MCP_PROVIDER_MANAGED_ENABLED = 'IS_MCP_PROVIDER_MANAGED_ENABLED',

  // String flags
  CF_SCHEDULER_MODE = 'CF_SCHEDULER_MODE', // Values: "off" | "shadow" | "live" | "complete"
  QUEUE_BACKEND_MODE = 'QUEUE_BACKEND_MODE', // Values: "bullmq" | "shadow" | "live" | "complete"
  USAGE_REPORT_TRIGGER_SECRET = 'USAGE_REPORT_TRIGGER_SECRET',
  USAGE_REPORT_OVERRIDE_EMAIL = 'USAGE_REPORT_OVERRIDE_EMAIL',

  // Numeric flags
  MAX_WORKFLOW_LIMIT_NUMBER = 'MAX_WORKFLOW_LIMIT_NUMBER',
  MAX_LAYOUT_LIMIT_NUMBER = 'MAX_LAYOUT_LIMIT_NUMBER',
  MAX_STEPS_PER_WORKFLOW_LIMIT_NUMBER = 'MAX_STEPS_PER_WORKFLOW_LIMIT_NUMBER',
  MAX_DEFER_DURATION_IN_MS_NUMBER = 'MAX_DEFER_DURATION_IN_MS_NUMBER',
  MAX_THROTTLE_WINDOW_DURATION_IN_MS_NUMBER = 'MAX_THROTTLE_WINDOW_DURATION_IN_MS_NUMBER',
  LOG_EXPIRATION_DAYS_NUMBER = 'LOG_EXPIRATION_DAYS_NUMBER',
  MAX_DATE_ANALYTICS_ENABLED_NUMBER = 'MAX_DATE_ANALYTICS_ENABLED_NUMBER',
  MAX_ENVIRONMENT_COUNT = 'MAX_ENVIRONMENT_COUNT',
  MAX_SUBSCRIBER_DEVICE_TOKENS_NUMBER = 'MAX_SUBSCRIBER_DEVICE_TOKENS_NUMBER',
  MAX_ENVIRONMENT_VARIABLES_LIMIT_NUMBER = 'MAX_ENVIRONMENT_VARIABLES_LIMIT_NUMBER',
  MAX_STEP_RESOLVERS_NUMBER = 'MAX_STEP_RESOLVERS_NUMBER',
  MAX_DOMAINS_LIMIT_NUMBER = 'MAX_DOMAINS_LIMIT_NUMBER',
  MAX_AGENTS_LIMIT_NUMBER = 'MAX_AGENTS_LIMIT_NUMBER',
  MAX_CUSTOM_EMAIL_DOMAINS_NUMBER = 'MAX_CUSTOM_EMAIL_DOMAINS_NUMBER',
  IS_ANALYTICS_PAGE_ENABLED = 'IS_ANALYTICS_PAGE_ENABLED',
  IS_LEGACY_SELECTOR_BUTTON_VISIBLE = 'IS_LEGACY_SELECTOR_BUTTON_VISIBLE',
}

export enum CloudflareSchedulerMode {
  OFF = 'off',
  SHADOW = 'shadow',
  LIVE = 'live',
  COMPLETE = 'complete',
}

export enum QueueBackendMode {
  BULLMQ = 'bullmq',
  SHADOW = 'shadow',
  LIVE = 'live',
  COMPLETE = 'complete',
}

export type FeatureFlags = {
  [key in FeatureFlagsKeysEnum]: boolean | number | string | undefined;
};
