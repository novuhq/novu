import { describe, expect, it } from 'vitest';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { createLiquidTolerantValidator } from './liquid-tolerant-validator';

/** The generated schemas repeat this branch as a distinct literal at every site — so does this. */
const liquidString = () => ({ type: 'string', pattern: '\\{\\{|\\{%' });

/** Two block shapes discriminated by `type`, reached through `$ref` like the Slack schema is. */
const schema = {
  definitions: {
    divider: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['type'],
          properties: { type: { anyOf: [{ type: 'string', const: 'divider' }, liquidString()] } },
        },
        liquidString(),
      ],
    },
    image: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'image_url'],
          properties: {
            type: { anyOf: [{ type: 'string', const: 'image' }, liquidString()] },
            image_url: { type: 'string' },
          },
        },
        liquidString(),
      ],
    },
  },
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { anyOf: [{ type: 'boolean' }, liquidString()] },
        blocks: {
          anyOf: [
            { type: 'array', items: { anyOf: [{ $ref: '#/definitions/divider' }, { $ref: '#/definitions/image' }] } },
            liquidString(),
          ],
        },
      },
    },
    liquidString(),
  ],
} as unknown as JSONSchemaDto;

describe('createLiquidTolerantValidator', () => {
  const validate = createLiquidTolerantValidator(schema);

  it('accepts a Liquid template wherever a concrete value is expected', () => {
    expect(validate({ enabled: '{{payload.enabled}}', blocks: '{{payload.blocks}}' })).toEqual([]);
    expect(validate({ blocks: ['{% if x %}{% endif %}'] })).toEqual([]);
  });

  it('keeps only the branch the discriminator points at when a $ref union member has a typo', () => {
    const errors = validate({ blocks: [{ type: 'image', image_url: 'https://example.com', img_url: 'oops' }] });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      instancePath: '/blocks/0',
      keyword: 'additionalProperties',
      params: { additionalProperty: 'img_url' },
    });
  });

  it('never reports the enclosing composition when a concrete failure explains it', () => {
    const errors = validate({ enabled: 12 });

    expect(errors.map((error) => error.keyword)).toEqual(['type']);
    expect(errors[0]?.instancePath).toBe('/enabled');
  });
});
