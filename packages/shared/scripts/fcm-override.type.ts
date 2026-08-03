import type { BaseMessage } from 'firebase-admin/messaging';

// Generator input for `generate:fcm-schema`: BaseMessage plus Novu-exposed routing fields.
// Mutual exclusion among routing keys is appended by the generator after schema generation.

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
