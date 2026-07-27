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

  /**
   * ImageBlock wraps its image_url / slack_file shapes in a nested anyOf. When the value's type
   * matches none of those variants, every nested branch reports a type const mismatch — without
   * bubbling that up, the parent ImageBlock branch looks "matched" and leaks alt_text / image_url /
   * slack_file required errors onto an actions block.
   */
  it('shadows a nested-variant block when every nested branch rejects the type discriminator', () => {
    const item = '/blocks/0';
    const errors: SchemaValidationErrorLike[] = [
      {
        instancePath: item,
        schemaPath: `${BLOCK_UNION}/0/required`,
        keyword: 'required',
        message: "must have required property 'elements'",
      },
      {
        instancePath: item,
        schemaPath: `${BLOCK_UNION}/1/anyOf/0/required`,
        keyword: 'required',
        message: "must have required property 'alt_text'",
      },
      {
        instancePath: item,
        schemaPath: `${BLOCK_UNION}/1/anyOf/0/required`,
        keyword: 'required',
        message: "must have required property 'image_url'",
      },
      {
        instancePath: `${item}/type`,
        schemaPath: `${BLOCK_UNION}/1/anyOf/0/properties/type/const`,
        keyword: 'const',
        message: 'must be equal to constant',
      },
      {
        instancePath: item,
        schemaPath: `${BLOCK_UNION}/1/anyOf/1/required`,
        keyword: 'required',
        message: "must have required property 'alt_text'",
      },
      {
        instancePath: item,
        schemaPath: `${BLOCK_UNION}/1/anyOf/1/required`,
        keyword: 'required',
        message: "must have required property 'slack_file'",
      },
      {
        instancePath: `${item}/type`,
        schemaPath: `${BLOCK_UNION}/1/anyOf/1/properties/type/const`,
        keyword: 'const',
        message: 'must be equal to constant',
      },
      {
        instancePath: item,
        schemaPath: `${BLOCK_UNION}/1/anyOf`,
        keyword: 'anyOf',
        message: 'must match a schema in anyOf',
      },
      {
        instancePath: item,
        schemaPath: BLOCK_UNION,
        keyword: 'anyOf',
        message: 'must match a schema in anyOf',
      },
    ];

    expect(selectDiscriminatedErrors(errors, { blocks: [{ type: 'actions' }] })).toEqual([
      {
        instancePath: item,
        schemaPath: `${BLOCK_UNION}/0/required`,
        keyword: 'required',
        message: "must have required property 'elements'",
      },
    ]);
  });

  it('keeps one type discriminator error when no concrete block matches the type', () => {
    const item = '/blocks/0';
    const typeConst: SchemaValidationErrorLike = {
      instancePath: `${item}/type`,
      schemaPath: `#/definitions/ActionsBlock/anyOf/0/properties/type/anyOf/0/const`,
      keyword: 'const',
      message: 'must be equal to constant',
    };
    const errors: SchemaValidationErrorLike[] = [
      typeConst,
      {
        instancePath: item,
        schemaPath: `#/definitions/ActionsBlock/anyOf/1/type`,
        keyword: 'type',
        message: 'must be string',
      },
      {
        instancePath: `${item}/type`,
        schemaPath: `#/definitions/ImageBlock/anyOf/0/anyOf/0/properties/type/anyOf/0/const`,
        keyword: 'const',
        message: 'must be equal to constant',
      },
      {
        instancePath: item,
        schemaPath: `#/definitions/ImageBlock/anyOf/0/anyOf/0/required`,
        keyword: 'required',
        message: "must have required property 'alt_text'",
      },
      {
        instancePath: `${item}/type`,
        schemaPath: `#/definitions/ImageBlock/anyOf/0/anyOf/1/properties/type/anyOf/0/const`,
        keyword: 'const',
        message: 'must be equal to constant',
      },
      {
        instancePath: item,
        schemaPath: `#/definitions/ImageBlock/anyOf/1/type`,
        keyword: 'type',
        message: 'must be string',
      },
      {
        instancePath: item,
        schemaPath: `#/definitions/KnownBlock/anyOf/0/anyOf`,
        keyword: 'anyOf',
        message: 'must match a schema in anyOf',
      },
    ];

    const result = selectDiscriminatedErrors(errors, { blocks: [{ type: 'imagee' }] });

    expect(result.filter((error) => error.keyword === 'required')).toEqual([]);
    expect(result.filter((error) => error.keyword === 'const')).toHaveLength(1);
    expect(result.some((error) => error.instancePath === `${item}/type` && error.keyword === 'const')).toBe(true);
  });

  it('keeps only the id branch when both id and link are present in a required-key oneOf', () => {
    const site = '#/definitions/MediaObject/anyOf/0/oneOf';
    const errors: SchemaValidationErrorLike[] = [
      {
        instancePath: '/document',
        schemaPath: `${site}/0/additionalProperties`,
        keyword: 'additionalProperties',
        message: 'must NOT have additional properties',
      },
      {
        instancePath: '/document',
        schemaPath: `${site}/1/additionalProperties`,
        keyword: 'additionalProperties',
        message: 'must NOT have additional properties',
      },
      {
        instancePath: '/document',
        schemaPath: site,
        keyword: 'oneOf',
        message: 'must match exactly one schema in oneOf',
      },
    ];
    const schema = {
      definitions: {
        MediaObject: {
          anyOf: [
            {
              type: 'object',
              oneOf: [
                { required: ['id'], properties: { id: { type: 'string' } }, additionalProperties: false },
                { required: ['link'], properties: { link: { type: 'string' } }, additionalProperties: false },
              ],
            },
            { type: 'string' },
          ],
        },
      },
    };

    const result = selectDiscriminatedErrors(
      errors,
      { document: { id: 'x', link: 'https://example.com', text: { body: 'hi' } } },
      schema
    );

    expect(result).toEqual([
      {
        instancePath: '/document',
        schemaPath: `${site}/0/additionalProperties`,
        keyword: 'additionalProperties',
        message: 'must NOT have additional properties',
      },
    ]);
  });

  it('keeps only the first branch required error when neither required key is present', () => {
    const site = '#/definitions/MediaObject/anyOf/0/oneOf';
    const errors: SchemaValidationErrorLike[] = [
      {
        instancePath: '/document',
        schemaPath: `${site}/0/required`,
        keyword: 'required',
        message: "must have required property 'id'",
      },
      {
        instancePath: '/document',
        schemaPath: `${site}/1/required`,
        keyword: 'required',
        message: "must have required property 'link'",
      },
    ];
    const schema = {
      definitions: {
        MediaObject: {
          anyOf: [
            {
              type: 'object',
              oneOf: [
                { required: ['id'], properties: { id: { type: 'string' } }, additionalProperties: false },
                { required: ['link'], properties: { link: { type: 'string' } }, additionalProperties: false },
              ],
            },
            { type: 'string' },
          ],
        },
      },
    };

    const result = selectDiscriminatedErrors(errors, { document: { text: { body: 'hi' } } }, schema);

    expect(result).toEqual([
      {
        instancePath: '/document',
        schemaPath: `${site}/0/required`,
        keyword: 'required',
        message: "must have required property 'id'",
      },
    ]);
  });

  it('leaves multi-key required oneOfs untouched (ActionObject-shaped)', () => {
    const site = '#/definitions/ActionObject/anyOf/0/oneOf';
    const errors: SchemaValidationErrorLike[] = [
      {
        instancePath: '/interactive/action',
        schemaPath: `${site}/0/required`,
        keyword: 'required',
        message: "must have required property 'sections'",
      },
      {
        instancePath: '/interactive/action',
        schemaPath: `${site}/1/required`,
        keyword: 'required',
        message: "must have required property 'buttons'",
      },
    ];
    const schema = {
      definitions: {
        ActionObject: {
          anyOf: [
            {
              type: 'object',
              oneOf: [
                {
                  required: ['button', 'sections'],
                  properties: { button: { type: 'string' }, sections: { type: 'array' } },
                  additionalProperties: false,
                },
                {
                  required: ['buttons'],
                  properties: { buttons: { type: 'array' } },
                  additionalProperties: false,
                },
              ],
            },
            { type: 'string' },
          ],
        },
      },
    };

    expect(selectDiscriminatedErrors(errors, { interactive: { action: { button: 'Pick' } } }, schema)).toEqual(errors);
  });
});
