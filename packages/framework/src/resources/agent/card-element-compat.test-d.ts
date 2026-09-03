import type { CardElement as NovuCardElement } from '@novu/agent-event-protocol';
import type { CardElement as StatelessCardElement } from '@novu/stateless';
import type { CardElement as ChatCardElement } from 'chat';
import { describe, expectTypeOf, it } from 'vitest';

type ProtocolChildType = NovuCardElement['children'][number]['type'];
type StatelessChildType = StatelessCardElement['children'][number]['type'];

/**
 * Chat SDK is the authoring kit. The protocol type is Novu-owned and may be a
 * structural superset (e.g. top-level `button`). This test locks the one
 * direction that must not break: every Chat SDK card is a valid wire card.
 *
 * If `chat` adds a child variant we do not have, this fails — update
 * `packages/agent-event-protocol/src/card-element.types.ts`.
 *
 * `@novu/stateless` holds a second Novu copy for Slack/Teams renderers. Lock
 * Stateless → protocol, and the child `type` union except wire-only `button`.
 */
describe('CardElement chat-sdk compatibility', () => {
  it('accepts every Chat SDK card on the Novu wire', () => {
    expectTypeOf<ChatCardElement>().toMatchTypeOf<NovuCardElement>();
  });

  it('accepts every @novu/stateless card on the Novu wire', () => {
    expectTypeOf<StatelessCardElement>().toMatchTypeOf<NovuCardElement>();
  });

  it('shares @novu/stateless child variants except the wire-only top-level button', () => {
    expectTypeOf<Exclude<ProtocolChildType, 'button'>>().toEqualTypeOf<StatelessChildType>();
  });
});
