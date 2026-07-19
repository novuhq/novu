/**
 * Cross-surface contracts for the tokenized WhatsApp Embedded Signup flow.
 * Produced by the API's public signup-status endpoint and consumed by the
 * connect CLI (completion polling) and the dashboard signup page.
 */

/** Why a signup link can no longer be used. */
export type WhatsAppSignupLinkInvalidReason = 'expired' | 'invalid';

/**
 * Secret-free signup progress for a tokenized WhatsApp signup link. Tokens
 * consumed by a successful completion still resolve as `valid: true` (with
 * `credentialsSaved: true`) for the rest of their TTL so CLI polling can
 * observe completion.
 */
export type WhatsAppSignupLinkStatus =
  | {
      valid: true;
      /** Display name of the agent this signup link connects. */
      agentName: string;
      /** True once the WhatsApp send credentials are saved on the integration. */
      credentialsSaved: boolean;
      /** Human-readable WhatsApp business phone number, used to build wa.me test deep links. */
      displayPhoneNumber?: string;
    }
  | {
      valid: false;
      reason: WhatsAppSignupLinkInvalidReason;
    };

/** Why Meta Embedded Signup cannot be completed on a deployment. */
export type WhatsAppEmbeddedSignupUnavailableReason = 'feature_disabled' | 'missing_platform_config';
