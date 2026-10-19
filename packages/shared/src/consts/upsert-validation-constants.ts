export const MAX_TAG_ELEMENTS = 16;
export const MAX_TAG_LENGTH = 64;
export const MAX_NAME_LENGTH = 128;
export const MAX_DESCRIPTION_LENGTH = 256;

/**
 * Single source of truth for the maximum length of an agent name across Novu
 * (API DTOs, dashboard forms, managed-agent generation, and CLI managed-spec
 * validation). Enforced on input only — existing agents with longer names keep
 * working and externally-sourced names (e.g. adopted provider agents) are
 * truncated to this length rather than rejected.
 */
export const AGENT_NAME_MAX_LENGTH = 60;

/**
 * Maximum length for a manually created agent identifier (slug).
 * Prevents HTTP 414 URI Too Long errors caused by excessively long URLs.
 */
export const AGENT_IDENTIFIER_MAX_LENGTH = 60;
