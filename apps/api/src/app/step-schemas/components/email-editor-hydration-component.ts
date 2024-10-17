/* eslint-disable */
import { TipTapNodeSchemaDto } from '@novu/shared-internal';

/**
 * Collects placeholders from a TipTapNode structure.
 *
 * @param {TipTapNodeSchemaDto} node - The root node of the TipTap structure.
 * @returns {PlaceholderMap} An object mapping main placeholders to their nested placeholders.
 */
export function collectPlaceholders(node: TipTapNodeSchemaDto): PlaceholderMap {
  const placeholders: PlaceholderMap = {
    for: {},
    show: {},
    regular: {},
  };

  function traverse(node: TipTapNodeSchemaDto) {
    if (node.type === 'for' && node.attr) {
      const mainPlaceholder = node.attr.each;
      if (mainPlaceholder) {
        if (!placeholders.for[mainPlaceholder]) {
          placeholders.for[mainPlaceholder] = [];
        }

        if (node.content) {
          node.content.forEach((nestedNode) => {
            if (nestedNode.content) {
              nestedNode.content.forEach((childNode) => {
                if (childNode.type === 'text' && childNode.text) {
                  const nestedPlaceholder = `{{novu.item.${childNode.text}}}`;
                  placeholders.for[mainPlaceholder].push(nestedPlaceholder);
                }
              });
            }
          });
        }
      }
    } else if (node.type === 'show' && node.attr) {
      const showPlaceholder = node.attr.when;
      if (showPlaceholder) {
        placeholders.show[showPlaceholder] = [];
      }
    } else if (node.type === 'text' && node.text) {
      const regularPlaceholder = `{{novu.payload.${node.text}}}`;
      placeholders.regular[regularPlaceholder] = [];
    }

    if (node.content) {
      node.content.forEach(traverse);
    }
  }

  traverse(node);
  return placeholders;
}

type PlaceholderMap = {
  for: {
    [key: string]: string[];
  };
  show: {
    [key: string]: any[];
  };
  regular: {
    [key: string]: any[];
  };
};

const exampleNode: TipTapNodeSchemaDto = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '{{novu.payload.intro}} Wow, this editor instance exports its content as JSON.',
        },
      ],
    },
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
      content: [
        {
          type: 'h1',
          content: [
            {
              type: 'text',
              text: 'Hi customer',
            },
          ],
        },
      ],
    },
  ],
};

// Uncomment the following line to see the collected placeholders in action
// const collectedPlaceholders = collectPlaceholders(exampleNode);
// console.log(collectedPlaceholders);
