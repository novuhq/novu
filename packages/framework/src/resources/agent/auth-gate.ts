import type { CardElement } from 'chat';
import type {
  AgentHandlerContext,
  AgentSubscriber,
  AgentSubscriberAccess,
  AuthConfig,
  AuthConfigObject,
} from './agent.types';
import { isCardElement } from './guards';

/**
 * Reserved conversation-metadata key holding the platform message id of the auth
 * CTA card posted to an unlinked author. Read back server-side to edit that same
 * card into the "account linked" confirmation the moment the author links.
 *
 * IMPORTANT: mirrored as `AGENT_AUTH_METADATA_KEYS.authCardMessageId` in
 * `packages/shared/src/types/agent.ts` (the framework does not depend on
 * `@novu/shared`). These literals MUST stay in sync.
 */
export const AUTH_CARD_MESSAGE_ID_KEY = '__novu:authCardMessageId';

/**
 * Reserved conversation-metadata key holding the fully-resolved "account linked"
 * confirmation card (with any per-agent `linkedTitle`/`linkedMessage` overrides
 * already applied). Frozen at gate time so the server can swap the CTA for it
 * without re-running the agent's auth callback.
 *
 * IMPORTANT: mirrored as `AGENT_AUTH_METADATA_KEYS.authLinkedCard` in
 * `packages/shared/src/types/agent.ts`. Keep in sync.
 */
export const AUTH_LINKED_CARD_KEY = '__novu:authLinkedCard';

/**
 * Minimal structural view of the handler context needed to gate on auth. Keeps
 * the helper usable from any handler shape (onMessage, onAction) without
 * coupling to the full runtime context type.
 */
export interface AuthGateContext {
  readonly subscriber: AgentSubscriber | null;
  reply(content: string | CardElement): Promise<unknown>;
}

/**
 * @deprecated Use {@link AuthConfig}. Retained as an alias for the CTA options.
 */
export type AuthCtaOptions = AuthConfig;

/**
 * True when the message author is an authenticated, linked Novu subscriber (as
 * opposed to an auto-provisioned phantom or an unresolved sender). This is the
 * canonical gating input for `restricted` distributed agents.
 */
export function isAuthenticatedAuthor(ctx: Pick<AuthGateContext, 'subscriber'>): boolean {
  return ctx.subscriber?.isLinked === true;
}

function authCard(options: AuthConfigObject): CardElement {
  const message =
    options.message ??
    'To use this agent, sign in to link your account. This confirms who you are so the agent can act on your behalf.';

  const children: CardElement['children'] = [];

  if (options.title) {
    children.push({ type: 'text', content: options.title });
  }

  children.push({ type: 'text', content: message });

  if (options.linkUrl) {
    children.push({
      type: 'actions',
      children: [
        {
          type: 'link-button',
          label: options.buttonLabel ?? 'Sign in to continue',
          url: options.linkUrl,
          style: 'primary',
        },
      ],
    });
  }

  return { type: 'card', children };
}

/**
 * Builds the text-only "account linked" confirmation card that replaces the sign-in
 * CTA once the author has linked their account. Carries no button — linking is done.
 */
function authLinkedCard(options: AuthConfigObject): CardElement {
  const title = options.linkedTitle ?? 'Account linked';
  const message = options.linkedMessage ?? "You're all set — your account is now connected.";

  return {
    type: 'card',
    children: [
      { type: 'text', content: title },
      { type: 'text', content: message },
    ],
  };
}

/**
 * Resolves an {@link AuthConfig} into both the sign-in CTA card to post and the
 * confirmation copy to freeze for the eventual "account linked" edit. Invokes the
 * callback form at most once. A callback returning a fully custom `CardElement`
 * carries no confirmation copy, so confirmation defaults are used.
 */
async function resolveAuthCards(
  ctx: AgentHandlerContext,
  options: AuthConfig
): Promise<{ signInCard: CardElement; linkedCard: CardElement }> {
  const resolved = typeof options === 'function' ? await options(ctx) : options;

  if (isCardElement(resolved)) {
    return { signInCard: resolved, linkedCard: authLinkedCard({}) };
  }

  return { signInCard: authCard(resolved), linkedCard: authLinkedCard(resolved) };
}

/**
 * Builds the "sign in to link your account" CTA card shown to unlinked authors
 * of a `restricted` agent. Reusable so every distributor renders a consistent
 * gate. When no `linkUrl` is supplied the card renders message-only (no button).
 */
export async function buildAuthCtaCard(ctx: AgentHandlerContext, options: AuthConfig): Promise<CardElement> {
  const { signInCard } = await resolveAuthCards(ctx, options);

  return signInCard;
}

/**
 * Convenience gate for the bridge/agent: if the author is not a linked
 * subscriber, post the auth CTA card and return `false` so the handler can
 * short-circuit before invoking the model. Returns `true` when the author is
 * authenticated and the turn may proceed.
 *
 * Prefer letting the framework apply the gate automatically (driven by the
 * agent's `subscriberAccess` on the bridge) via {@link passesAuthGate}; reach for
 * this only when gating manually inside a handler.
 */
export async function requireAuthenticatedAuthor(ctx: AgentHandlerContext, options: AuthConfig = {}): Promise<boolean> {
  if (isAuthenticatedAuthor(ctx)) {
    return true;
  }

  const { signInCard, linkedCard } = await resolveAuthCards(ctx, options);
  const handle = await ctx.reply(signInCard);

  // Persist enough for the server to update this card the instant the author links,
  // without waiting for their next message: which platform message to edit, and the
  // exact confirmation card to swap in (overrides already applied).
  ctx.metadata.set(AUTH_CARD_MESSAGE_ID_KEY, handle.messageId);
  ctx.metadata.set(AUTH_LINKED_CARD_KEY, linkedCard);

  return false;
}

/**
 * Framework-level auth gate applied by `dispatchAgentEvent`. Only `restricted`
 * agents gate; on those, an unlinked author is shown the (optionally customized)
 * auth CTA and the turn is short-circuited. Returns `true` when the turn may
 * proceed. `open` (or an absent policy, for backward compatibility) never gates.
 */
export async function passesAuthGate(
  ctx: AgentHandlerContext,
  params: { subscriberAccess?: AgentSubscriberAccess; auth?: AuthConfig }
): Promise<boolean> {
  if (params.subscriberAccess !== 'restricted') {
    return true;
  }

  return requireAuthenticatedAuthor(ctx, params.auth ?? {});
}
