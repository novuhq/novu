import { describe, expect, it } from 'vitest';
import { type SchemaValidationErrorLike, selectDiscriminatedErrors } from './select-discriminated-errors';

const BLOCKS_PROPERTY = '#/anyOf/0/properties/blocks';
const BLOCK_UNION = `${BLOCKS_PROPERTY}/anyOf/0/items/anyOf/0/anyOf`;

/**
 * Mirrors what AJV emits for a liquid-tolerant Slack schema when `blocks[index]` is an
 * `image` block carrying one misspelled key. Branch 0 is `divider`, 1 is `image`, 2 is `section`.
 */
function blockKitErrors(index: number): SchemaValidationErrorLike[] {
  const item = `/blocks/${index}`;

  return [
    {
      instancePath: item,
      schemaPath: `${BLOCK_UNION}/0/additionalProperties`,
      keyword: 'additionalProperties',
      message: 'must NOT have additional properties',
    },
    {
      instancePath: `${item}/type`,
      schemaPath: `${BLOCK_UNION}/0/properties/type/anyOf/0/const`,
      keyword: 'const',
      message: 'must be equal to constant',
    },
    {
      instancePath: `${item}/type`,
      schemaPath: `${BLOCK_UNION}/0/properties/type/anyOf/1/pattern`,
      keyword: 'pattern',
      message: 'must match pattern "\\{\\{|\\{%"',
    },
    {
      instancePath: `${item}/type`,
      schemaPath: `${BLOCK_UNION}/0/properties/type/anyOf`,
      keyword: 'anyOf',
      message: 'must match a schema in anyOf',
    },
    {
      instancePath: item,
      schemaPath: `${BLOCK_UNION}/1/additionalProperties`,
      keyword: 'additionalProperties',
      message: 'must NOT have additional properties',
    },
    {
      instancePath: item,
      schemaPath: `${BLOCK_UNION}/2/required`,
      keyword: 'required',
      message: "must have required property 'text'",
    },
    {
      instancePath: `${item}/type`,
      schemaPath: `${BLOCK_UNION}/2/properties/type/anyOf/0/const`,
      keyword: 'const',
      message: 'must be equal to constant',
    },
    {
      instancePath: item,
      schemaPath: BLOCK_UNION,
      keyword: 'anyOf',
      message: 'must match a schema in anyOf',
    },
    {
      instancePath: item,
      schemaPath: `${BLOCKS_PROPERTY}/anyOf/0/items/anyOf/1/type`,
      keyword: 'type',
      message: 'must be string',
    },
    {
      instancePath: item,
      schemaPath: `${BLOCKS_PROPERTY}/anyOf/0/items/anyOf`,
      keyword: 'anyOf',
      message: 'must match a schema in anyOf',
    },
    {
      instancePath: '/blocks',
      schemaPath: `${BLOCKS_PROPERTY}/anyOf/1/type`,
      keyword: 'type',
      message: 'must be string',
    },
    {
      instancePath: '/blocks',
      schemaPath: `${BLOCKS_PROPERTY}/anyOf`,
      keyword: 'anyOf',
      message: 'must match a schema in anyOf',
    },
    { instancePath: '', schemaPath: '#/anyOf/1/type', keyword: 'type', message: 'must be string' },
    { instancePath: '', schemaPath: '#/anyOf', keyword: 'anyOf', message: 'must match a schema in anyOf' },
  ];
}

describe('selectDiscriminatedErrors', () => {
  it('returns the errors unchanged when nothing is discriminated by a type field', () => {
    const errors: SchemaValidationErrorLike[] = [
      {
        instancePath: '/text',
        schemaPath: '#/anyOf/0/properties/text/type',
        keyword: 'type',
        message: 'must be string',
      },
    ];

    expect(selectDiscriminatedErrors(errors, { text: 12 })).toEqual(errors);
  });

  it('keeps only the matching block branch when a Block Kit item has a typo', () => {
    const errors = blockKitErrors(0);
    const data = { blocks: [{ type: 'image', image_url: 'https://x', img_url: 'y' }] };

    expect(selectDiscriminatedErrors(errors, data)).toEqual([
      {
        instancePath: '/blocks/0',
        schemaPath: `${BLOCK_UNION}/1/additionalProperties`,
        keyword: 'additionalProperties',
        message: 'must NOT have additional properties',
      },
    ]);
  });

  it('resolves each failing array item independently', () => {
    const errors = [...blockKitErrors(0), ...blockKitErrors(1)];
    const data = {
      blocks: [
        { type: 'image', image_url: 'https://x', img_url: 'y' },
        { type: 'image', image_url: 'https://z', img_url: 'w' },
      ],
    };

    expect(selectDiscriminatedErrors(errors, data).map((error) => error.instancePath)).toEqual([
      '/blocks/0',
      '/blocks/1',
    ]);
  });

  it('keeps unrelated errors elsewhere in the override', () => {
    const unrelated: SchemaValidationErrorLike = {
      instancePath: '/mrkdwn',
      schemaPath: '#/anyOf/0/properties/mrkdwn/anyOf/0/type',
      keyword: 'type',
      message: 'must be boolean',
    };
    const data = { mrkdwn: 3, blocks: [{ type: 'image', image_url: 'https://x', img_url: 'y' }] };

    expect(selectDiscriminatedErrors([...blockKitErrors(0), unrelated], data)).toContainEqual(unrelated);
  });

  it('leaves the errors alone when the failing node has no string type field', () => {
    const errors = blockKitErrors(0);

    expect(selectDiscriminatedErrors(errors, { blocks: [{ image_url: 'https://x' }] })).toEqual(errors);
  });

  it('leaves the errors alone when no branch was ruled out by the discriminator', () => {
    const errors: SchemaValidationErrorLike[] = [
      {
        instancePath: '/blocks/0',
        schemaPath: `${BLOCK_UNION}/0/required`,
        keyword: 'required',
        message: "must have required property 'elements'",
      },
      {
        instancePath: '/blocks/0',
        schemaPath: `${BLOCK_UNION}/1/required`,
        keyword: 'required',
        message: "must have required property 'image_url'",
      },
    ];

    expect(selectDiscriminatedErrors(errors, { blocks: [{ type: 'image' }] })).toEqual(errors);
  });
});
