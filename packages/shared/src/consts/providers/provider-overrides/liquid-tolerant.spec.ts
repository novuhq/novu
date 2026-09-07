import { describe, expect, it } from 'vitest';
import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';
import { LIQUID_TEMPLATE_PATTERN, toLiquidTolerantSchema } from './liquid-tolerant';

const liquidBranch = { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN };

/**
 * The root of an override blob never gains a template branch, so leaf behaviour has to be
 * observed one level down.
 */
function tolerantProperty(schema: JSONSchemaDto): JSONSchemaDto {
  const tolerant = toLiquidTolerantSchema({ type: 'object', properties: { value: schema } });

  return tolerant.properties?.value as JSONSchemaDto;
}

describe('toLiquidTolerantSchema', () => {
  it('withholds the template branch from the root so a bare template cannot stand in for the blob', () => {
    const tolerant = toLiquidTolerantSchema({
      type: 'object',
      additionalProperties: false,
      properties: { summary: { type: 'string' } },
    });

    expect(tolerant.anyOf).toBeUndefined();
    expect(tolerant.type).toBe('object');
    expect(tolerant.additionalProperties).toBe(false);
  });

  it('lets a non-string leaf also accept a Liquid template string', () => {
    expect(tolerantProperty({ type: 'boolean' })).toEqual({
      anyOf: [{ type: 'boolean' }, liquidBranch],
    });
  });

  it('leaves an unconstrained string leaf untouched because it already accepts templates', () => {
    expect(tolerantProperty({ type: 'string', description: 'Alert message.' })).toEqual({
      type: 'string',
      description: 'Alert message.',
    });
  });

  it('keeps a length-limited string tolerant, since a template is longer than what it renders to', () => {
    expect(tolerantProperty({ type: 'string', maxLength: 50 })).toEqual({
      anyOf: [{ type: 'string', maxLength: 50 }, liquidBranch],
    });
  });

  it('makes a string enum tolerant so a template passes but a bogus literal still fails', () => {
    expect(tolerantProperty({ type: 'string', enum: ['critical', 'warning'] })).toEqual({
      anyOf: [{ type: 'string', enum: ['critical', 'warning'] }, liquidBranch],
    });
  });

  it('rewrites nested object properties and preserves required and additionalProperties', () => {
    expect(
      tolerantProperty({
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
            count: { anyOf: [{ type: 'number' }, liquidBranch] },
            label: { type: 'string' },
          },
        },
        liquidBranch,
      ],
    });
  });

  it('adds the template branch once per composition instead of once per member', () => {
    expect(
      tolerantProperty({
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
              properties: { size: { anyOf: [{ type: 'number' }, liquidBranch] } },
            },
            { type: 'object', properties: { name: { type: 'string' } } },
          ],
        },
        liquidBranch,
      ],
    });
  });

  it('rewrites a composition at the root without giving the root a template branch', () => {
    const tolerant = toLiquidTolerantSchema({
      anyOf: [
        { type: 'object', properties: { size: { type: 'number' } } },
        { type: 'object', properties: { name: { type: 'string' } } },
      ],
    });

    expect(tolerant.anyOf).toHaveLength(2);
    expect(tolerant.anyOf).not.toContainEqual(liquidBranch);
    expect((tolerant.anyOf?.[0] as JSONSchemaDto).properties?.size).toEqual({
      anyOf: [{ type: 'number' }, liquidBranch],
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

    const tolerant = tolerantProperty(blocksLike);
    const arrayBranch = tolerant.anyOf?.[0] as JSONSchemaDto;
    const itemsSchema = arrayBranch.items as JSONSchemaDto;
    const imageBranch = (itemsSchema.anyOf?.[0] as JSONSchemaDto).oneOf?.[1] as JSONSchemaDto;

    expect(tolerant.anyOf?.[1]).toEqual(liquidBranch);
    expect(itemsSchema.anyOf?.[1]).toEqual(liquidBranch);
    expect(imageBranch.additionalProperties).toBe(false);
    expect(imageBranch.required).toEqual(['type']);
    expect(imageBranch.properties?.type).toEqual({
      anyOf: [{ type: 'string', const: 'image' }, liquidBranch],
    });
    expect(imageBranch.properties?.is_animated).toEqual({
      anyOf: [{ type: 'boolean' }, liquidBranch],
    });
    expect(imageBranch.properties?.alt_text).toEqual({ type: 'string' });
  });

  it('makes definitions tolerant and leaves the references to them alone', () => {
    const tolerant = toLiquidTolerantSchema({
      type: 'object',
      properties: { block: { $ref: '#/definitions/Block' } },
      definitions: {
        Block: { type: 'object', properties: { indent: { type: 'number' } } },
      },
    });
    const blockDefinition = tolerant.definitions?.Block as JSONSchemaDto;

    // `#/definitions/...` is absolute, so definitions have to stay at the root.
    expect(tolerant.properties?.block).toEqual({ $ref: '#/definitions/Block' });
    expect(blockDefinition.anyOf?.[1]).toEqual(liquidBranch);
    expect((blockDefinition.anyOf?.[0] as JSONSchemaDto).properties?.indent).toEqual({
      anyOf: [{ type: 'number' }, liquidBranch],
    });
  });

  it('hoists definitions above the wrapper for a nested node that carries them', () => {
    const tolerant = tolerantProperty({
      type: 'object',
      properties: { block: { $ref: '#/definitions/Block' } },
      definitions: { Block: { type: 'object', properties: { indent: { type: 'number' } } } },
    });

    expect(tolerant.definitions?.Block).toBeDefined();
    expect((tolerant.anyOf?.[0] as JSONSchemaDto).definitions).toBeUndefined();
  });

  it('carries keywords it does not rewrite through untouched', () => {
    const withFormat = { type: 'integer', format: 'int64' } as const satisfies JSONSchemaDto;

    expect(tolerantProperty(withFormat).anyOf?.[0]).toEqual(withFormat);
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
