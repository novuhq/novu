import { createLiquidEngine } from '@novu/framework/internal';
import { renderCardElementWithLiquid, extractCardElementStrings } from './card-liquid.utils';
import type { CardElementLike } from './types';

describe('card-liquid.utils', () => {
  const engine = createLiquidEngine();

  const sampleCard = (): CardElementLike => ({
    type: 'card',
    title: 'Hello {{ subscriber.firstName }}',
    subtitle: 'Order #{{ payload.orderId }}',
    children: [
      { type: 'text', content: 'Amount: {{ payload.amount }}' },
      {
        type: 'actions',
        children: [
          {
            type: 'link-button',
            label: 'View {{ payload.status }}',
            url: 'https://shop.example.com/orders/{{ payload.orderId }}',
          },
        ],
      },
      {
        type: 'fields',
        children: [{ type: 'field', label: 'Status', value: '{{ payload.status }}' }],
      },
    ],
  });

  const variables = {
    subscriber: { firstName: 'Alice' },
    payload: { orderId: 'ORD-42', amount: 99, status: 'Confirmed' },
  } as Record<string, unknown>;

  it('renders Liquid across every user-facing string leaf', async () => {
    const rendered = await renderCardElementWithLiquid(sampleCard(), variables, engine);

    expect(rendered.title).toBe('Hello Alice');
    expect(rendered.subtitle).toBe('Order #ORD-42');

    const textBlock = rendered.children[0] as Record<string, unknown>;
    expect(textBlock.content).toBe('Amount: 99');

    const actions = rendered.children[1] as { children: Array<Record<string, unknown>> };
    expect(actions.children[0].label).toBe('View Confirmed');
    expect(actions.children[0].url).toBe('https://shop.example.com/orders/ORD-42');

    const fields = rendered.children[2] as { children: Array<Record<string, unknown>> };
    expect(fields.children[0].value).toBe('Confirmed');
  });

  it('leaves non-templated strings untouched', async () => {
    const card: CardElementLike = {
      type: 'card',
      title: 'Static title',
      children: [
        { type: 'text', content: 'Static body' },
        { type: 'divider' },
      ],
    };

    const rendered = await renderCardElementWithLiquid(card, {}, engine);
    expect(rendered.title).toBe('Static title');
    expect((rendered.children[0] as { content: string }).content).toBe('Static body');
    expect((rendered.children[1] as { type: string }).type).toBe('divider');
  });

  it('extracts templated string leaves for batch translation', () => {
    const strings = extractCardElementStrings(sampleCard());
    expect(strings).toContain('Hello {{ subscriber.firstName }}');
    expect(strings).toContain('Amount: {{ payload.amount }}');
    expect(strings).toContain('View {{ payload.status }}');
    // ids and types should be excluded
    expect(strings.every((s) => !s.includes('link-button'))).toBe(true);
  });

  it('does not mutate ids / types / non-user-facing fields', async () => {
    const card: CardElementLike = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: [{ type: 'button', id: 'btn-{{ payload.x }}', label: 'OK' }],
        },
      ],
    };
    const rendered = await renderCardElementWithLiquid(card, { payload: { x: 'DANGEROUS' } }, engine);
    const actions = rendered.children[0] as { children: Array<Record<string, unknown>> };
    // `id` is NOT in the allow-list of templated fields (it's a discriminant / callback id).
    expect(actions.children[0].id).toBe('btn-{{ payload.x }}');
    expect(actions.children[0].label).toBe('OK');
  });
});
