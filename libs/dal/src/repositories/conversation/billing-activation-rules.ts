import { ConversationActivationReasonEnum } from '../conversation-activation/conversation-activation.entity';
import { ConversationBillingState } from './conversation.entity';

/**
 * Inputs the activation rules are evaluated against. `windowThresholdIso` is the
 * ISO timestamp before which the last engagement counts as "window expired"
 * (i.e. `now - rollingWindow`), computed by the caller from the channel's window.
 */
export interface ActivationRuleParams {
  /** The billing period key the conversation would be counted against now. */
  periodKey: string;
  /** ISO timestamp; an engagement older than this has lapsed its rolling window. */
  windowThresholdIso: string;
}

/**
 * Single source of truth for "does this engagement start a new active
 * conversation?". Each rule colocates its two encodings — the MongoDB fragment
 * used by the atomic write-claim (`startActivationIfNeeded`) and the in-memory
 * predicate used by the read-only gate (`classifyActivation`) — so the two
 * paths cannot silently diverge. Order encodes reason priority
 * (NEW > REOPEN > NEW_CYCLE > WINDOW_EXPIRED); for the count decision only
 * "any rule matches" matters, the order just picks the audit reason.
 *
 * Keep `toMongo` and `matches` semantically equivalent — `billing-activation-rules.spec.ts`
 * locks this with a state matrix.
 */
interface ActivationRule {
  reason: ConversationActivationReasonEnum;
  toMongo(params: ActivationRuleParams): Record<string, unknown>;
  matches(billing: ConversationBillingState | undefined, params: ActivationRuleParams): boolean;
}

export const ACTIVATION_RULES: ActivationRule[] = [
  {
    // Never counted before (brand-new conversation, or post-resolve with billing cleared).
    reason: ConversationActivationReasonEnum.NEW,
    toMongo: () => ({ 'billing.lastCountedPeriodKey': { $exists: false } }),
    matches: (billing) => !billing?.lastCountedPeriodKey,
  },
  {
    // Resolved since it was last counted — the next engagement is a reopen.
    reason: ConversationActivationReasonEnum.REOPEN,
    toMongo: () => ({ 'billing.resolvedAt': { $exists: true } }),
    matches: (billing) => Boolean(billing?.resolvedAt),
  },
  {
    // Continuing conversation, but a new billing period has begun.
    reason: ConversationActivationReasonEnum.NEW_CYCLE,
    toMongo: (params) => ({ 'billing.lastCountedPeriodKey': { $ne: params.periodKey } }),
    matches: (billing, params) =>
      Boolean(billing?.lastCountedPeriodKey) && billing?.lastCountedPeriodKey !== params.periodKey,
  },
  {
    // Continuing conversation, same period, but the rolling window has lapsed.
    reason: ConversationActivationReasonEnum.WINDOW_EXPIRED,
    toMongo: (params) => ({ 'billing.lastEngagementAt': { $lt: params.windowThresholdIso } }),
    matches: (billing, params) =>
      billing?.lastEngagementAt !== undefined && billing.lastEngagementAt < params.windowThresholdIso,
  },
];

/**
 * Builds the `$or` clause for the atomic activation claim. The conditions are
 * order-independent for matching — any match means a new activation should be
 * counted.
 */
export function buildActivationOrConditions(params: ActivationRuleParams): Record<string, unknown>[] {
  return ACTIVATION_RULES.map((rule) => rule.toMongo(params));
}

/**
 * Read-only classification mirroring `buildActivationOrConditions`. Returns the
 * highest-priority reason the engagement would start a new activation under, or
 * `null` if it falls inside the current activation.
 */
export function classifyActivationReason(
  billing: ConversationBillingState | undefined,
  params: ActivationRuleParams
): ConversationActivationReasonEnum | null {
  const rule = ACTIVATION_RULES.find((candidate) => candidate.matches(billing, params));

  return rule ? rule.reason : null;
}
