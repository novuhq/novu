import { expect } from 'chai';
import { TipTapNodeSchemaDto } from '@novu/shared-internal';
import { collectPlaceholders } from './email-editor-hydration-component';

describe('collectPlaceholders', () => {
  it('should collect placeholders from multiple for nodes, show nodes, and regular placeholders', () => {
    const node: TipTapNodeSchemaDto = {
      type: 'doc',
      content: [
        {
          type: 'for',
          attr: {
            each: '{{novu.payload.comment1}}',
          },
          content: [
            {
              type: 'h1',
              content: [
                {
                  type: 'text',
                  text: '{{novu.item.body1}}',
                },
              ],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{novu.payload.intro}} This is an introduction paragraph.',
            },
          ],
        },
        {
          type: 'for',
          attr: {
            each: '{{novu.payload.comment2}}',
          },
          content: [
            {
              type: 'h2',
              content: [
                {
                  type: 'text',
                  text: '{{novu.item.body2}}',
                },
              ],
            },
          ],
        },
        {
          type: 'show',
          attr: {
            when: '{{novu.payload.isPremiumPlan}}',
          },
          content: [],
        },
        {
          type: 'for',
          attr: {
            each: '{{novu.payload.comment3}}',
          },
          content: [
            {
              type: 'h3',
              content: [
                {
                  type: 'text',
                  text: '{{novu.item.body3}}',
                },
              ],
            },
          ],
        },
        {
          type: 'show',
          attr: {
            when: '{{novu.payload.isBetaUser}}',
          },
          content: [],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a regular text without placeholders.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{novu.payload.footer}} This is the footer text.',
            },
          ],
        },
      ],
    };

    const result = collectPlaceholders(node);

    expect(result).to.deep.equal({
      for: {
        'novu.payload.comment1': ['novu.item.body1'],
        'novu.payload.comment2': ['novu.item.body2'],
        'novu.payload.comment3': ['novu.item.body3'],
      },
      show: {
        'novu.payload.isPremiumPlan': [],
        'novu.payload.isBetaUser': [],
      },
      regular: {
        'novu.payload.intro': [],
        'novu.payload.footer': [],
      },
    });
  });

  // Additional test cases can be added here
});
