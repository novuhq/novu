import { Actions, Button, Card, CardText } from 'chat';
import { jsx, jsxs } from 'chat/jsx-runtime';
import { describe, expect, it } from 'vitest';
import { resolveCardContent } from './resolve-card-content';

describe('resolveCardContent', () => {
  it('resolves a direct Card JSX element', async () => {
    const element = jsxs(Card, {
      title: 'Pick a content direction',
      children: [
        jsx(CardText, { children: 'From your brain dump' }),
        jsx(Actions, { children: jsx(Button, { id: 'angle-0', label: '1. Builder lesson' }) }),
      ],
    });

    const card = await resolveCardContent(element);

    expect(card).toMatchObject({
      type: 'card',
      title: 'Pick a content direction',
      children: [{ type: 'text', content: 'From your brain dump' }, { type: 'actions' }],
    });
  });

  it('invokes custom function components before serialization', async () => {
    function AnglesCard() {
      return jsxs(Card, {
        title: 'Pick a content direction',
        children: [
          jsx(CardText, { children: 'From your brain dump:\nHere are 3 angles:' }),
          jsx(Actions, { children: jsx(Button, { id: 'angle-0', label: '1. Builder lesson' }) }),
        ],
      });
    }

    const card = await resolveCardContent(jsx(AnglesCard, {}));

    expect(card).toMatchObject({
      type: 'card',
      title: 'Pick a content direction',
    });
    expect(card?.children).toHaveLength(2);
    expect(card?.children[0]).toMatchObject({
      type: 'text',
      content: 'From your brain dump:\nHere are 3 angles:',
    });
  });

  it('invokes nested custom components', async () => {
    function InnerCopy() {
      return jsx(CardText, { children: 'Nested copy' });
    }

    function AnglesCard() {
      return jsxs(Card, {
        title: 'Nested',
        children: [jsx(InnerCopy, {}), jsx(Actions, { children: jsx(Button, { id: 'ok', label: 'OK' }) })],
      });
    }

    const card = await resolveCardContent(jsx(AnglesCard, {}));

    expect(card?.title).toBe('Nested');
    expect(card?.children[0]).toMatchObject({ type: 'text', content: 'Nested copy' });
  });

  it('accepts already-resolved CardElement objects', async () => {
    const element = Card({
      title: 'Ready',
      children: [CardText('Your order is ready')],
    });

    const card = await resolveCardContent(element);

    expect(card).toEqual(element);
  });
});
