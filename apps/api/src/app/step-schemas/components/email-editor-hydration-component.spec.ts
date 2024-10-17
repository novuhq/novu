import { expect } from 'chai';
import { TipTapNodeSchemaDto } from '@novu/shared-internal';
import { collectPlaceholders } from '../e2e/generate-preview.e2e';

describe('collectPlaceholders', () => {
  it('should collect placeholders from multiple for nodes', () => {
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
          type: 'for',
          attr: {
            each: '{{novu.payload.comment2}}',
          },
          content: [
            {
              type: 'h1',
              content: [
                {
                  type: 'text',
                  text: '{{novu.item.body2}}',
                },
              ],
            },
          ],
        },
      ],
    };

    const result = collectPlaceholders(node);

    expect(result).to.deep.equal({
      for: {
        '{{novu.payload.comment1}}': ['{{novu.item.body1}}'],
        '{{novu.payload.comment2}}': ['{{novu.item.body2}}'],
      },
      show: {},
      regular: {},
    });
  });

  it('should collect placeholders from multiple show nodes', () => {
    const node: TipTapNodeSchemaDto = {
      type: 'doc',
      content: [
        {
          type: 'show',
          attr: {
            when: '{{novu.payload.isPremiumPlan}}',
          },
          content: [],
        },
        {
          type: 'show',
          attr: {
            when: '{{novu.payload.isBetaUser}}',
          },
          content: [],
        },
      ],
    };

    const result = collectPlaceholders(node);

    expect(result).to.deep.equal({
      for: {},
      show: {
        '{{novu.payload.isPremiumPlan}}': [],
        '{{novu.payload.isBetaUser}}': [],
      },
      regular: {},
    });
  });

  it('should collect placeholders from both for and show nodes', () => {
    const node: TipTapNodeSchemaDto = {
      type: 'doc',
      content: [
        {
          type: 'for',
          attr: {
            each: '{{novu.payload.comment}}',
          },
          content: [
            {
              type: 'h1',
              content: [
                {
                  type: 'text',
                  text: '{{novu.item.body}}',
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
      ],
    };

    const result = collectPlaceholders(node);

    expect(result).to.deep.equal({
      for: {
        '{{novu.payload.comment}}': ['{{novu.item.body}}'],
      },
      show: {
        '{{novu.payload.isPremiumPlan}}': [],
      },
      regular: {},
    });
  });

  it('should handle cases with no for or show nodes', () => {
    const node: TipTapNodeSchemaDto = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{novu.payload.intro}}',
            },
          ],
        },
      ],
    };

    const result = collectPlaceholders(node);

    expect(result).to.deep.equal({
      for: {},
      show: {},
      regular: {
        '{{novu.payload.intro}}': [],
      },
    });
  });

  it('should handle cases with no placeholders', () => {
    const node: TipTapNodeSchemaDto = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'No placeholders here.',
            },
          ],
        },
      ],
    };

    const result = collectPlaceholders(node);

    expect(result).to.deep.equal({
      for: {},
      show: {},
      regular: {},
    });
  });
});
