import { describe, expect, it } from 'vitest';
import { type OverrideFieldSchema } from './override-field-schema';
import { createSchemaResolver } from './schema-resolver';

const blockKitRootSchema: OverrideFieldSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    blocks: { type: 'array', items: { $ref: '#/definitions/KnownBlock' } },
    attachments: {
      type: 'array',
      items: { $ref: '#/definitions/MessageAttachment' },
    },
  },
  definitions: {
    KnownBlock: {
      anyOf: [
        { $ref: '#/definitions/SectionBlock' },
        { $ref: '#/definitions/DividerBlock' },
        { $ref: '#/definitions/ImageBlock' },
      ],
    },
    SectionBlock: {
      type: 'object',
      description:
        'Displays text, possibly alongside block elements. See {@link https://docs.slack.dev/block-kit blocks}.',
      properties: {
        type: { type: 'string', const: 'section' },
        text: { type: 'string' },
      },
    },
    DividerBlock: {
      type: 'object',
      description: 'A content divider.',
      properties: {
        type: { type: 'string', const: 'divider' },
      },
    },
    // Mirrors Slack ImageBlock: nested anyOf of leaf shapes that share `type: "image"`, with the
    // human description on the union node rather than the leaves.
    ImageBlock: {
      description: 'Displays an image.',
      anyOf: [
        {
          type: 'object',
          properties: {
            type: { type: 'string', const: 'image' },
            image_url: { type: 'string' },
          },
        },
        {
          type: 'object',
          properties: {
            type: { type: 'string', const: 'image' },
            slack_file: { type: 'object' },
          },
        },
      ],
    },
    MessageAttachment: {
      type: 'object',
      properties: {
        color: { type: 'string' },
      },
    },
  },
};

describe('createSchemaResolver.unionBranchSummaries', () => {
  it('summarizes discriminated anyOf branches and strips JSDoc link markup', () => {
    const resolver = createSchemaResolver(blockKitRootSchema);
    const summaries = resolver.unionBranchSummaries(resolver.itemsNode(blockKitRootSchema.properties?.blocks));

    expect(summaries).toEqual([
      {
        typeValue: 'section',
        description: 'Displays text, possibly alongside block elements. See blocks.',
      },
      {
        typeValue: 'divider',
        description: 'A content divider.',
      },
      {
        typeValue: 'image',
        description: 'Displays an image.',
      },
    ]);
  });

  it('returns an empty list for non-union item schemas', () => {
    const resolver = createSchemaResolver(blockKitRootSchema);
    const summaries = resolver.unionBranchSummaries(resolver.itemsNode(blockKitRootSchema.properties?.attachments));

    expect(summaries).toEqual([]);
  });
});
