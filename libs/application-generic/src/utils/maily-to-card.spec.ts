import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { compileMailyToCard } from './maily-to-card';

const doc = (...content: MailyJSONContent[]): MailyJSONContent => ({ type: 'doc', content });

const paragraph = (...content: MailyJSONContent[]): MailyJSONContent => ({ type: 'paragraph', content });

const text = (value: string, marks?: MailyJSONContent['marks']): MailyJSONContent => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
});

describe('compileMailyToCard', () => {
  it('compiles a paragraph into a plain text block', () => {
    const card = compileMailyToCard(doc(paragraph(text('hello world'))));

    expect(card).toEqual({
      type: 'card',
      children: [{ type: 'text', content: 'hello world', style: 'plain' }],
    });
  });

  it('compiles a heading into a bold text block', () => {
    const card = compileMailyToCard(doc({ type: 'heading', content: [text('Title')] }));

    expect(card.children[0]).toEqual({ type: 'text', content: 'Title', style: 'bold' });
  });

  it('serializes inline marks to a markdown subset', () => {
    const card = compileMailyToCard(
      doc(
        paragraph(
          text('bold', [{ type: 'bold' }]),
          text(' '),
          text('italic', [{ type: 'italic' }]),
          text(' '),
          text('link', [{ type: 'link', attrs: { href: 'https://novu.co' } }])
        )
      )
    );

    expect(card.children[0]).toEqual({
      type: 'text',
      content: '**bold** _italic_ [link](https://novu.co)',
      style: 'plain',
    });
  });

  it('compiles a bullet list into a single text block with bullet glyphs', () => {
    const listItem = (value: string): MailyJSONContent => ({
      type: 'listItem',
      content: [paragraph(text(value))],
    });

    const card = compileMailyToCard(doc({ type: 'bulletList', content: [listItem('apple'), listItem('banana')] }));

    expect(card.children[0]).toEqual({
      type: 'text',
      content: '• apple\n• banana',
      style: 'plain',
    });
  });

  it('compiles an ordered list into a single text block with numeric markers', () => {
    const listItem = (value: string): MailyJSONContent => ({
      type: 'listItem',
      content: [paragraph(text(value))],
    });

    const card = compileMailyToCard(doc({ type: 'orderedList', content: [listItem('first'), listItem('second')] }));

    expect(card.children[0]).toEqual({
      type: 'text',
      content: '1. first\n2. second',
      style: 'plain',
    });
  });

  it('maps image nodes to image blocks', () => {
    const card = compileMailyToCard(doc({ type: 'image', attrs: { src: 'https://novu.co/logo.png', alt: 'logo' } }));

    expect(card.children[0]).toEqual({ type: 'image', url: 'https://novu.co/logo.png', alt: 'logo' });
  });

  it('maps horizontalRule to a divider block', () => {
    const card = compileMailyToCard(doc(paragraph(text('a')), { type: 'horizontalRule' }));

    expect(card.children).toContainEqual({ type: 'divider' });
  });

  it('groups consecutive cardButton nodes into a single actions block', () => {
    const button = (label: string, url: string): MailyJSONContent => ({
      type: 'cardButton',
      attrs: { label, url },
    });

    const card = compileMailyToCard(doc(button('One', 'https://one.test'), button('Two', 'https://two.test')));

    expect(card.children).toEqual([
      {
        type: 'actions',
        children: [
          { type: 'link-button', label: 'One', url: 'https://one.test' },
          { type: 'link-button', label: 'Two', url: 'https://two.test' },
        ],
      },
    ]);
  });

  it('caps an actions row at 3 buttons', () => {
    const button = (label: string): MailyJSONContent => ({
      type: 'cardButton',
      attrs: { label, url: `https://${label}.test` },
    });

    const card = compileMailyToCard(doc(button('a'), button('b'), button('c'), button('d')));

    const actions = card.children[0];
    expect(actions.type).toBe('actions');
    expect(actions.type === 'actions' && actions.children).toHaveLength(3);
  });

  it('drops action buttons without a url or label', () => {
    const card = compileMailyToCard(doc(paragraph(text('body')), { type: 'cardButton', attrs: { label: 'no-url' } }));

    expect(card.children).toEqual([{ type: 'text', content: 'body', style: 'plain' }]);
  });

  it('compiles a cardActions row into a single actions block', () => {
    const cardButton = (label: string, url: string): MailyJSONContent => ({
      type: 'cardButton',
      attrs: { label, url },
    });

    const card = compileMailyToCard(
      doc({
        type: 'cardActions',
        content: [cardButton('One', 'https://one.test'), cardButton('Two', 'https://two.test')],
      })
    );

    expect(card.children).toEqual([
      {
        type: 'actions',
        children: [
          { type: 'link-button', label: 'One', url: 'https://one.test' },
          { type: 'link-button', label: 'Two', url: 'https://two.test' },
        ],
      },
    ]);
  });

  it('caps a cardActions row at 3 buttons', () => {
    const cardButton = (label: string): MailyJSONContent => ({
      type: 'cardButton',
      attrs: { label, url: `https://${label}.test` },
    });

    const card = compileMailyToCard(
      doc({
        type: 'cardActions',
        content: [cardButton('a'), cardButton('b'), cardButton('c'), cardButton('d')],
      })
    );

    const actions = card.children[0];
    expect(actions.type).toBe('actions');
    expect(actions.type === 'actions' && actions.children).toHaveLength(3);
  });

  it('drops cardActions buttons without a url and keeps the surrounding blocks', () => {
    const card = compileMailyToCard(
      doc(
        paragraph(text('body')),
        {
          type: 'cardActions',
          content: [
            { type: 'cardButton', attrs: { label: 'no-url' } },
            { type: 'cardButton', attrs: { label: 'linked', url: 'https://linked.test' } },
          ],
        }
      )
    );

    expect(card.children).toEqual([
      { type: 'text', content: 'body', style: 'plain' },
      { type: 'actions', children: [{ type: 'link-button', label: 'linked', url: 'https://linked.test' }] },
    ]);
  });

  it('preserves the button id on cardActions buttons', () => {
    const card = compileMailyToCard(
      doc({
        type: 'cardActions',
        content: [{ type: 'cardButton', attrs: { label: 'View', url: 'https://view.test', actionId: 'view-1' } }],
      })
    );

    expect(card.children).toEqual([
      { type: 'actions', children: [{ type: 'link-button', label: 'View', url: 'https://view.test', id: 'view-1' }] },
    ]);
  });

  it('throws when the document has no renderable blocks', () => {
    expect(() => compileMailyToCard(doc(paragraph()))).toThrow(/empty card/i);
  });
});
