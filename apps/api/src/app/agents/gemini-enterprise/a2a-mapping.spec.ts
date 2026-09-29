import { expect } from 'chai';
import type { CardElement } from 'chat';
import {
  A2UI_MIME,
  cardToA2uiParts,
  GeTurn,
  GeTurnInput,
  NO_REPLY_TEXT,
  openTurn,
  parseInbound,
  SUPERSEDED_TEXT,
  step,
} from './a2a-mapping';

/** A card click as Gemini Enterprise sent it (Cloud Run capture, 2026-09-29), minus transport fields. */
function geClick(action: Record<string, unknown>) {
  return {
    message: {
      kind: 'message',
      role: 'user',
      contextId: '34a81d27-b53b-4495-a060-112cdb29cb46',
      messageId: 'f812a28a-a811-49fd-8260-e81a5ff75fbc',
      parts: [
        { kind: 'text', metadata: { is_user_input: true }, text: 'User action triggered.' },
        {
          kind: 'data',
          metadata: { is_user_input: true, mimeType: A2UI_MIME },
          data: { version: 'v0.9', action: { timestamp: '2026-09-29T12:59:01.819Z', ...action } },
        },
      ],
    },
  };
}

const choiceCard: CardElement = {
  type: 'card',
  title: 'Which agent should handle this?',
  children: [
    { type: 'text', content: '\nPick one:' },
    { type: 'divider' },
    { type: 'link', label: 'Docs', url: 'https://docs.novu.co' },
    { type: 'fields', children: [{ type: 'field', label: 'Region', value: 'EU' }] },
    {
      type: 'actions',
      children: [
        { type: 'button', id: 'route:sales', label: 'Sales', value: 'sales', style: 'primary' },
        { type: 'button', id: 'route:research', label: 'Deep Research' },
        { type: 'link-button', label: 'Open console', url: 'https://console.cloud.google.com' },
      ],
    },
  ],
};

function components(card: CardElement, messageId: string) {
  const [, update] = cardToA2uiParts(card, messageId);

  return (update.data.updateComponents as { components: Array<Record<string, any>> }).components;
}

function run(inputs: GeTurnInput[], turn: GeTurn = openTurn({ taskId: 'task-1', contextId: 'ctx-1' })) {
  const events: Array<Record<string, any>> = [];
  let closes = 0;

  for (const input of inputs) {
    const result = step(turn, input);
    turn = result.turn;
    events.push(...result.events);
    if (result.close) closes += 1;
  }

  return { turn, events, closes, final: events.at(-1) };
}

describe('Gemini Enterprise A2A mapping', () => {
  describe('parseInbound', () => {
    it('reads a first-turn text message without a contextId and ignores non-text parts', () => {
      const inbound = parseInbound({
        message: {
          messageId: 'm1',
          parts: [
            { kind: 'text', text: 'Find me ' },
            { kind: 'data', data: { foo: 1 } },
            { kind: 'text', text: 'a sales agent ' },
          ],
        },
      });

      expect(inbound).to.deep.equal({
        kind: 'message',
        contextId: null,
        messageId: 'm1',
        text: 'Find me \na sales agent',
      });
    });

    it('passes a foreign A2UI action through as id = event name, value = JSON context', () => {
      const inbound = parseInbound(
        geClick({
          name: 'select_option',
          surfaceId: 'choice-62736870',
          sourceComponentId: 'opt-b',
          context: { choice: 'B' },
        })
      );

      expect(inbound).to.deep.equal({
        kind: 'action',
        contextId: '34a81d27-b53b-4495-a060-112cdb29cb46',
        messageId: 'f812a28a-a811-49fd-8260-e81a5ff75fbc',
        action: { id: 'select_option', value: '{"choice":"B"}', sourceMessageId: undefined },
      });
    });

    it('round-trips a Novu card button click back to the Novu action id, value and source message', () => {
      const button = components(choiceCard, 'msg_abc123').find(
        (c) => c.component === 'Button' && c.variant === 'primary'
      );
      const inbound = parseInbound(
        geClick({ ...button?.action.event, surfaceId: 'novu-msg_abc123', sourceComponentId: button?.id })
      );

      expect(inbound.kind).to.equal('action');
      expect(inbound.kind === 'action' && inbound.action).to.deep.equal({
        id: 'route:sales',
        value: 'sales',
        sourceMessageId: 'msg_abc123',
      });
    });
  });

  describe('cardToA2uiParts', () => {
    it('renders only verified components and degrades links, fields and link-buttons to markdown text', () => {
      const [create, update] = cardToA2uiParts(choiceCard, 'msg_abc123');
      const list = components(choiceCard, 'msg_abc123');
      const byId = new Map(list.map((c) => [c.id, c]));
      const column = byId.get('col')?.children as string[];

      expect(create.metadata?.mimeType).to.equal(A2UI_MIME);
      expect((create.data.createSurface as { surfaceId: string }).surfaceId).to.equal('novu-msg_abc123');
      expect((update.data.updateComponents as { surfaceId: string }).surfaceId).to.equal('novu-msg_abc123');
      expect(new Set(list.map((c) => c.component))).to.deep.equal(new Set(['Card', 'Column', 'Text', 'Button']));
      expect(column.map((id) => byId.get(id)?.text ?? byId.get(`${id}-label`)?.text)).to.deep.equal([
        'Which agent should handle this?',
        'Pick one:',
        '[Docs](https://docs.novu.co)',
        '**Region:** EU',
        'Sales',
        'Deep Research',
        '[Open console](https://console.cloud.google.com)',
      ]);
      expect(list.every((c) => c.component !== 'Button' || byId.has(c.child))).to.equal(true);
    });
  });

  describe('turn reducer', () => {
    it('streams edits as status lines but sends each message once, at its latest version, with cards last', () => {
      const { events, final, closes } = run([
        { type: 'start' },
        { type: 'typing', status: 'Routing…' },
        { type: 'post', messageId: 'a', content: { text: 'Thinking' } },
        { type: 'edit', messageId: 'a', content: { text: 'Here is the plan' } },
        { type: 'post', messageId: 'card', content: { card: choiceCard } },
        { type: 'post', messageId: 'b', content: { text: 'Second message' } },
        { type: 'end' },
      ]);

      expect(events.slice(0, 2).map((e) => e.kind)).to.deep.equal(['task', 'status-update']);
      expect(events[0].status.state).to.equal('submitted');
      expect(closes).to.equal(1);
      expect(final?.final).to.equal(true);
      expect(final?.status.state).to.equal('completed');

      const parts = final?.status.message.parts as Array<Record<string, any>>;

      expect(parts.filter((p) => p.kind === 'text').map((p) => p.text)).to.deep.equal([
        'Here is the plan',
        'Second message',
      ]);
      expect(parts.slice(-2).map((p) => Object.keys(p.data)[1])).to.deep.equal(['createSurface', 'updateComponents']);

      const statusIds = events.filter((e) => e.status.message).map((e) => e.status.message.messageId);

      expect(new Set(statusIds).size).to.equal(statusIds.length);
    });

    it('re-sends an earlier-turn card edit as updateComponents only', () => {
      const { final } = run([
        { type: 'start' },
        { type: 'edit', messageId: 'old-card', content: { card: { ...choiceCard, children: [] } } },
        { type: 'post', messageId: 'a', content: { text: 'Routed to sales' } },
        { type: 'end' },
      ]);
      const parts = final?.status.message.parts as Array<Record<string, any>>;

      expect(parts.map((p) => (p.kind === 'text' ? p.text : Object.keys(p.data)[1]))).to.deep.equal([
        'Routed to sales',
        'updateComponents',
      ]);
      expect(parts[1].data.updateComponents.surfaceId).to.equal('novu-old-card');
    });

    it('closes once: a superseded turn keeps its partial text and drops everything after', () => {
      const { turn, events, closes } = run([
        { type: 'start' },
        { type: 'post', messageId: 'a', content: { text: 'Partial answer' } },
        { type: 'superseded' },
        { type: 'post', messageId: 'b', content: { text: 'late' } },
        { type: 'end' },
      ]);
      const finals = events.filter((e) => e.final);

      expect(closes).to.equal(1);
      expect(finals).to.have.length(1);
      expect(finals[0].status.message.parts.map((p) => p.text)).to.deep.equal(['Partial answer', SUPERSEDED_TEXT]);
      expect(turn.closedBy).to.equal('superseded');
      expect(turn.dropped).to.equal(2);
    });

    it('tells the user when the agent ended without replying', () => {
      const { final } = run([{ type: 'start' }, { type: 'typing' }, { type: 'end' }]);

      expect(final?.status.message.parts).to.deep.equal([{ kind: 'text', text: NO_REPLY_TEXT }]);
    });
  });
});
