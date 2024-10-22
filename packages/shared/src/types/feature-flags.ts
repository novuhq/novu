/**
 * The required format for a boolean flag key.
 */
export type IFlagKey = `IS_${Uppercase<string>}_ENABLED` | `IS_${Uppercase<string>}_DISABLED`;

/**
 * Helper function to test that enum keys and values match correct format.
 *
 * It is not possible as of Typescript 5.2 to declare a type for an enum key or value in-line.
 * Therefore we must test the enum via a helper function that abstracts the enum to an object.
 *
 * If the test fails, you should review your `enum` to verify that both the
 * keys and values match the format specified by the `IFlagKey` template literal type.
 * ref: https://stackoverflow.com/a/58181315
 *
 * @param testEnum - the Enum to type check
 */
export function testFlagEnumValidity<TEnum extends IFlags, IFlags = Record<IFlagKey, IFlagKey>>(
  _: TEnum & Record<Exclude<keyof TEnum, keyof IFlags>, ['Key must follow `IFlagKey` format']>
) {}

export enum SystemCriticalFlagsEnum {
  IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'IS_IN_MEMORY_CLUSTER_MODE_ENABLED',
}

export enum FeatureFlagsKeysEnum {
  IS_TEMPLATE_STORE_ENABLED = 'IS_TEMPLATE_STORE_ENABLED',
  IS_USE_MERGED_DIGEST_ID_ENABLED = 'IS_USE_MERGED_DIGEST_ID_ENABLED',
  IS_API_RATE_LIMITING_ENABLED = 'IS_API_RATE_LIMITING_ENABLED',
  IS_API_RATE_LIMITING_DRY_RUN_ENABLED = 'IS_API_RATE_LIMITING_DRY_RUN_ENABLED',
  IS_API_IDEMPOTENCY_ENABLED = 'IS_API_IDEMPOTENCY_ENABLED',
  IS_API_EXECUTION_LOG_QUEUE_ENABLED = 'IS_API_EXECUTION_LOG_QUEUE_ENABLED',
  IS_NEW_MESSAGES_API_RESPONSE_ENABLED = 'IS_NEW_MESSAGES_API_RESPONSE_ENABLED',
  IS_HUBSPOT_ONBOARDING_ENABLED = 'IS_HUBSPOT_ONBOARDING_ENABLED',
  IS_QUOTA_LIMITING_ENABLED = 'IS_QUOTA_LIMITING_ENABLED',
  IS_EVENT_QUOTA_LIMITING_ENABLED = 'IS_EVENT_QUOTA_LIMITING_ENABLED',
  IS_TEAM_MEMBER_INVITE_NUDGE_ENABLED = 'IS_TEAM_MEMBER_INVITE_NUDGE_ENABLED',
  IS_V2_ENABLED = 'IS_V2_ENABLED',
  IS_PLAYGROUND_ONBOARDING_ENABLED = 'IS_PLAYGROUND_ONBOARDING_ENABLED',
  IS_MIXPANEL_RECORDING_ENABLED = 'IS_MIXPANEL_RECORDING_ENABLED',
  IS_INTEGRATION_INVALIDATION_DISABLED = 'IS_INTEGRATION_INVALIDATION_DISABLED',
  IS_EMAIL_INLINE_CSS_DISABLED = 'IS_EMAIL_INLINE_CSS_DISABLED',
  IS_WORKFLOW_PREFERENCES_ENABLED = 'IS_WORKFLOW_PREFERENCES_ENABLED',
  IS_CONTROLS_AUTOCOMPLETE_ENABLED = 'IS_CONTROLS_AUTOCOMPLETE_ENABLED',
}
