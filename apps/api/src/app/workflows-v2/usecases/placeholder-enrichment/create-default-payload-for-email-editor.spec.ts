import { expect } from 'chai';
import { TipTapNode } from '@novu/shared';
import {
  CollectPlaceholdersFromTipTapSchemaUsecase,
  PlaceholderMap,
} from './collect-placeholders-from-tip-tap-schema.usecase';
import { TransformPlaceholderMapUseCase } from './transform-placeholder.usecase';

describe('default paylaod creator for email editor', () => {
  it('should collect placeholders from multiple for nodes, show nodes, and regular placeholders', () => {
    const node: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'for',
          attr: {
            each: '{{payload.comments}}',
          },
          content: [
            {
              type: 'h1',
              content: [
                {
                  type: 'text',
                  text: '{{item.subject}}-{{item.body}}',
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
              text: '{{payload.intro}} This is an introduction paragraph.',
            },
          ],
        },
        {
          type: 'for',
          attr: {
            each: '{{payload.comment2}}',
          },
          content: [
            {
              type: 'h2',
              content: [
                {
                  type: 'text',
                  text: '{{item.body2}}',
                },
              ],
            },
          ],
        },
        {
          type: 'show',
          attr: {
            when: '{{payload.isPremiumPlan}}',
          },
          content: [],
        },
        {
          type: 'show',
          attr: {
            when: '{{payload.isBetaUser}}',
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
              text: '{{payload.footer}} This is the footer text.',
            },
          ],
        },
      ],
    };

    const result = new CollectPlaceholdersFromTipTapSchemaUsecase().execute({ node });

    expect(result).to.deep.equal({
      for: {
        'payload.comments': ['item.subject', 'item.body'],
        'payload.comment2': ['item.body2'],
      },
      show: {
        'payload.isPremiumPlan': [],
        'payload.isBetaUser': [],
      },
      regular: {
        'payload.intro': [],
        'payload.footer': [],
      },
    });
  });
});

describe('transformPlaceholderMap', () => {
  it('should transform the PlaceholderMap into a nested JSON structure', () => {
    const input: PlaceholderMap = {
      for: {
        'payload.comments': ['item.field1', 'item.field2'],
      },
      show: {
        'payload.isPremiumPlan': [],
        'payload.isBetaUser': [],
      },
      regular: {
        'payload.intro': [],
        'payload.footer': [],
      },
    };

    const expectedOutput = {
      payload: {
        comments: [
          {
            field1: '{{item.field1}}-1',
            field2: '{{item.field2}}-1',
          },
          {
            field1: '{{item.field1}}-2',
            field2: '{{item.field2}}-2',
          },
        ],
        isPremiumPlan: 'true',
        isBetaUser: 'true',
        intro: '{{payload.intro}}',
        footer: '{{payload.footer}}',
      },
    };

    const output = new TransformPlaceholderMapUseCase().execute({ input });
    expect(output).to.deep.equal(expectedOutput);
  });
});
