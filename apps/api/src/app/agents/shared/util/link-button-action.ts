/**
 * Link buttons render with a `link-` prefixed action id. They open a URL in the
 * client; the chat SDK still emits an inbound action for the click, but there is
 * no server-side work to do — so callers swallow it. This is runtime-agnostic.
 */
export function isLinkButtonActionId(id: string | undefined): boolean {
  return typeof id === 'string' && id.startsWith('link-');
}
