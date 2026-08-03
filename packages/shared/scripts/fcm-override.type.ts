import type { BaseMessage } from 'firebase-admin/messaging';

/**
 * Strategy 1: generate from firebase-admin `BaseMessage` plus the four routing fields Novu
 * exposes in content overrides. At most one routing key may be set per override — the generator
 * appends pairwise JSON Schema mutual-exclusion (`allOf` / `not.required`) after generation.
 */
export type FcmOverride = BaseMessage & {
  /** Registration token that identifies a single device. */
  token?: string;
  /** Registration tokens for a multicast send (Novu multicast extension). */
  tokens?: string[];
  /**
   * Firebase topic name. Warning: when set in a step content override, every subscriber matching
   * the workflow receives a separate topic broadcast.
   */
  topic?: string;
  /**
   * Firebase condition expression. Warning: when set in a step content override, every subscriber
   * matching the workflow receives a separate condition broadcast.
   */
  condition?: string;
};
