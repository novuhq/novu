/**
 * Minimal structural types for `CardElement` — the unified chat content
 * model from the `chat` package. We re-declare loosely here so this module
 * doesn't need a type-only import of the ESM-only `chat` package (which
 * breaks CJS `isolatedModules` builds in some environments).
 *
 * At runtime we delegate to the real `chat` + adapter serializers.
 */

export interface CardElementLike {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: unknown[];
  [k: string]: unknown;
}

export type ChatPlatform = 'slack' | 'msteams' | 'discord';

export interface CompiledChatContent {
  /** Always present — flattened text fallback, safe for any provider. */
  text: string;
  /** Slack Block Kit `blocks[]`. */
  slackBlocks?: unknown[];
  /** Microsoft Teams Adaptive Card JSON. */
  adaptiveCard?: unknown;
  /** Discord webhook `embeds[]`. */
  discordEmbeds?: unknown[];
}

export type ProviderIdLike = string;
