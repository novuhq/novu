import { z } from 'zod';

const cardElementTextZodSchema = z
  .object({
    type: z.literal('text'),
    content: z.string(),
    style: z.enum(['plain', 'bold', 'muted']).optional(),
  })
  .strict();

const cardElementImageZodSchema = z
  .object({
    type: z.literal('image'),
    url: z.string(),
    alt: z.string().optional(),
  })
  .strict();

const cardElementDividerZodSchema = z
  .object({
    type: z.literal('divider'),
  })
  .strict();

const cardElementLinkButtonZodSchema = z
  .object({
    type: z.literal('link-button'),
    label: z.string(),
    url: z.string(),
    style: z.enum(['primary', 'danger', 'default']).optional(),
  })
  .strict();

const cardElementActionsZodSchema = z
  .object({
    type: z.literal('actions'),
    children: z.array(cardElementLinkButtonZodSchema),
  })
  .strict();

const cardElementChildZodSchema = z.discriminatedUnion('type', [
  cardElementTextZodSchema,
  cardElementImageZodSchema,
  cardElementDividerZodSchema,
  cardElementActionsZodSchema,
]);

export const cardElementZodSchema = z
  .object({
    type: z.literal('card'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    imageUrl: z.string().optional(),
    children: z.array(cardElementChildZodSchema),
  })
  .strict();
