import { type CardElement } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { cardElementZodSchema } from './card-element.schema';

const validCard: CardElement = {
  type: 'card',
  title: 'Deployment succeeded',
  subtitle: 'production',
  imageUrl: 'https://example.com/banner.png',
  children: [
    { type: 'text', content: 'The **release** is live.', style: 'bold' },
    { type: 'image', url: 'https://example.com/graph.png', alt: 'graph' },
    { type: 'divider' },
    { type: 'link', label: 'Release notes', url: 'https://example.com/notes' },
    {
      type: 'actions',
      children: [{ type: 'link-button', label: 'View', url: 'https://example.com', style: 'primary' }],
    },
  ],
};

describe('cardElementZodSchema', () => {
  it('round-trips a valid card', () => {
    const result = cardElementZodSchema.safeParse(validCard);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validCard);
    }
  });

  it('rejects an unknown element type', () => {
    const result = cardElementZodSchema.safeParse({
      ...validCard,
      children: [{ type: 'video', url: 'https://example.com/video.mp4' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a link-button with a missing url', () => {
    const result = cardElementZodSchema.safeParse({
      ...validCard,
      children: [{ type: 'actions', children: [{ type: 'link-button', label: 'View' }] }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a link child with a missing url', () => {
    const result = cardElementZodSchema.safeParse({
      ...validCard,
      children: [{ type: 'link', label: 'Docs' }],
    });

    expect(result.success).toBe(false);
  });

  it('is structurally compatible with the shared CardElement type', () => {
    const asInferred: z.infer<typeof cardElementZodSchema> = validCard;
    const parsed = cardElementZodSchema.parse(validCard);

    expect(parsed).toEqual(asInferred);
  });
});
