import type { BaseMessage } from 'firebase-admin/messaging';
import { NON_OVERRIDABLE_FCM_KEYS } from '../src/consts/providers/provider-overrides/fcm/keys.ts';

export { NON_OVERRIDABLE_FCM_KEYS };

/**
 * Strategy 1: generate from firebase-admin `BaseMessage` (pure content + platform configs).
 * Routing fields (`token` / `tokens` / `topic` / `condition`) live on extending message types
 * (`TokenMessage`, `TopicMessage`, …), not on `BaseMessage`. `NON_OVERRIDABLE_FCM_KEYS` documents
 * that product rule and feeds `assertRoutingKeysAreAbsent`.
 */
export type FcmOverride = BaseMessage;
