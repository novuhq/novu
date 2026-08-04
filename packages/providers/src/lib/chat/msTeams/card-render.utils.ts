import { CardElement, IChatRenderValidation } from '@novu/stateless';
import { CardPlatformLimits, InlineNode, mapCardText, validateCard } from '../card-render.utils';

/**
 * Teams Adaptive Card `TextBlock` renders standard markdown for bold/italic/links, but has no
 * strikethrough or inline-code support — so those markers are stripped to avoid literal `~~`/backticks.
 */
function inlineToTeams(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value;
        case 'code':
          return node.value;
        case 'strike':
          return inlineToTeams(node.children);
        case 'bold':
          return `**${inlineToTeams(node.children)}**`;
        case 'italic':
          return `_${inlineToTeams(node.children)}_`;
        case 'link': {
          const label = inlineToTeams(node.children);

          return node.url ? `[${label}](${node.url})` : label;
        }
        default: {
          const exhaustiveCheck: never = node;

          return exhaustiveCheck;
        }
      }
    })
    .join('');
}

/** Teams Adaptive Cards render standard markdown minus strike/code; strip the unsupported marks. */
export function toTeamsFlavoredCard(card: CardElement): CardElement {
  return mapCardText(card, inlineToTeams);
}

const TEAMS_LIMITS: CardPlatformLimits = {
  platform: 'Teams',
  maxBlocks: 500,
  maxTextLength: 40000,
  maxButtonsPerRow: 6,
};

export function validateTeamsCard(card: CardElement): IChatRenderValidation[] {
  return validateCard(card, TEAMS_LIMITS);
}
