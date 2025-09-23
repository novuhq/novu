type ContextType = string;
type ContextId = string;
type ContextData = Record<string, unknown>;

/**
 * Context value can be either a simple string identifier or a rich object with additional data
 *
 * @example
 * // Simple string value
 * "org-acme"
 *
 * @example
 * // Rich object with optional data
 * {
 *   id: "org-acme",
 *   data: { name: "Acme Corp", plan: "enterprise" }
 * }
 */
export type ContextValue =
  | string
  | {
      id: ContextId;
      data?: ContextData;
    };

/**
 * Context payload represents the raw context data provided by users when triggering workflows.
 * It's a flexible structure that maps context types to their values.
 *
 * This is the input format that gets processed and resolved into ContextResolved.
 *
 * @example
 * // Single context with string value
 * { tenant: "org-acme" }
 *
 * @example
 * // Multiple contexts with string values
 * { tenant: "org-acme", app: "jira", user: "john-doe" }
 *
 * @example
 * // Context with rich object containing additional data
 * {
 *   tenant: {
 *     id: "org-acme",
 *     data: { name: "Acme Corp", plan: "enterprise" }
 *   }
 * }
 *
 * @example
 * // Mixed context values (string and object)
 * {
 *   tenant: { id: "org-acme", data: { name: "Acme Corp" } },
 *   app: "jira",
 *   user: "john-doe"
 * }
 */
export type ContextPayload = Partial<Record<ContextType, ContextValue>>;

/**
 * Resolved contexts represent the normalized, fully-processed context data used internally
 * throughout the application and framework. This ensures consistent structure regardless
 * of the input format in ContextPayload.
 *
 * All contexts are normalized to have both an `id` and `data` field, even if the original
 * payload only provided a string value (in which case `data` will be an empty object).
 *
 * This type is used to:
 * - Pass context data between services without exposing full entity details
 * - Ensure consistent context structure in workflow execution
 * - Provide type safety for context access in templates and conditions
 *
 * @example
 * // Resolved from payload: { tenant: "org-acme", app: "jira" }
 * {
 *   tenant: {
 *     id: "org-acme",
 *     data: {} // Empty data since only ID was provided
 *   },
 *   app: {
 *     id: "jira",
 *     data: {} // Empty data since only ID was provided
 *   }
 * }
 *
 * @example
 * // Resolved from payload with rich data
 * {
 *   tenant: {
 *     id: "org-acme",
 *     data: { name: "Acme Corp", plan: "enterprise", region: "us-east" }
 *   },
 *   app: {
 *     id: "jira",
 *     data: { version: "8.0", environment: "production" }
 *   }
 * }
 */
export type ContextResolved = Record<
  ContextType,
  {
    id: ContextId;
    data: ContextData;
  }
>;
