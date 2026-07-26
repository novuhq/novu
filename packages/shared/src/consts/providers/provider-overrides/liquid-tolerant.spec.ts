import { describe, expect, it } from 'vitest';
import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';
import { LIQUID_TEMPLATE_PATTERN, toLiquidTolerantSchema } from './liquid-tolerant';

describe('toLiquidTolerantSchema', () => {
  it('lets a non-string leaf also accept a Liquid template string', () => {
    expect(toLiquidTolerantSchema({ type: 'boolean' })).toEqual({
      anyOf: [{ type: 'boolean' }, { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN }],
    });
  });

  it('leaves an unconstrained string leaf untouched because it already accepts templates', () => {
    expect(toLiquidTolerantSchema({ type: 'string', maxLength: 130 })).toEqual({
      type: 'string',
      maxLength: 130,
    });
  });

  it('makes a string enum tolerant so a template passes but a bogus literal still fails', () => {
    expect(toLiquidTolerantSchema({ type: 'string', enum: ['critical', 'warning'] })).toEqual({
      anyOf: [
        { type: 'string', enum: ['critical', 'warning'] },
        { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN },
      ],
    });
  });

  it('rewrites nested object properties and preserves required and additionalProperties', () => {
    expect(
      toLiquidTolerantSchema({
        type: 'object',
        additionalProperties: false,
        required: ['count'],
        properties: {
          count: { type: 'number' },
          label: { type: 'string' },
        },
      })
    ).toEqual({
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['count'],
          properties: {
            count: { anyOf: [{ type: 'number' }, { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN }] },
            label: { type: 'string' },
          },
        },
        { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN },
      ],
    });
  });

  it('adds the template branch once per composition instead of once per member', () => {
    expect(
      toLiquidTolerantSchema({
        anyOf: [
          { type: 'object', properties: { size: { type: 'number' } } },
          { type: 'object', properties: { name: { type: 'string' } } },
        ],
      })
    ).toEqual({
      anyOf: [
        {
          anyOf: [
            {
              type: 'object',
              properties: {
                size: { anyOf: [{ type: 'number' }, { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN }] },
              },
            },
            { type: 'object', properties: { name: { type: 'string' } } },
          ],
        },
        { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN },
      ],
    });
  });

  it('lets an array, each of its items, and each item field be replaced by a template', () => {
    const blocksLike = {
      type: 'array',
      items: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['type'],
            properties: { type: { type: 'string', const: 'divider' } },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['type'],
            properties: {
              type: { type: 'string', const: 'image' },
              alt_text: { type: 'string' },
              is_animated: { type: 'boolean' },
            },
          },
        ],
      },
    } as const satisfies JSONSchemaDto;

    const tolerant = toLiquidTolerantSchema(blocksLike);
    const arrayBranch = tolerant.anyOf?.[0] as JSONSchemaDto;
    const itemsSchema = arrayBranch.items as JSONSchemaDto;
    const imageBranch = (itemsSchema.anyOf?.[0] as JSONSchemaDto).oneOf?.[1] as JSONSchemaDto;

    expect(tolerant.anyOf?.[1]).toEqual({ type: 'string', pattern: LIQUID_TEMPLATE_PATTERN });
    expect(itemsSchema.anyOf?.[1]).toEqual({ type: 'string', pattern: LIQUID_TEMPLATE_PATTERN });
    expect(imageBranch.additionalProperties).toBe(false);
    expect(imageBranch.required).toEqual(['type']);
    expect(imageBranch.properties?.type).toEqual({
      anyOf: [
        { type: 'string', const: 'image' },
        { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN },
      ],
    });
    expect(imageBranch.properties?.is_animated).toEqual({
      anyOf: [{ type: 'boolean' }, { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN }],
    });
    expect(imageBranch.properties?.alt_text).toEqual({ type: 'string' });
  });

  it('carries keywords it does not rewrite through untouched', () => {
    const withRef = { $ref: '#/definitions/Block', description: 'A block.' } as unknown as JSONSchemaDto;

    expect(toLiquidTolerantSchema(withRef).anyOf?.[0]).toEqual(withRef);
  });

  it('does not mutate the schema it is given', () => {
    const original = {
      type: 'object',
      properties: { count: { type: 'number' } },
    } as const satisfies JSONSchemaDto;
    const snapshot = JSON.parse(JSON.stringify(original));

    toLiquidTolerantSchema(original);

    expect(original).toEqual(snapshot);
  });
});
