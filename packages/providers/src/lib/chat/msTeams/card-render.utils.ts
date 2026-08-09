import { CardElement, ChatRenderValidationLevelEnum, IChatRenderValidation } from '@novu/stateless';
import {
  CardValidator,
  InlineNode,
  mapCardText,
  maxBlocks,
  maxButtonsPerRow,
  maxTextLengthPerBlock,
  runCardValidators,
} from '../card-render.utils';

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

/**
 * Teams Adaptive Cards enforce no per-element limits in the adapter — extras are silently dropped
 * and the card still delivers (the real ceiling is the ~28KB total-card size). So these are
 * non-blocking degradation `WARNING`s; the generous caps rarely fire in practice.
 */
const TEAMS = { level: ChatRenderValidationLevelEnum.WARNING } as const;

const TEAMS_VALIDATORS: CardValidator[] = [
  maxBlocks({ ...TEAMS, limit: 500 }),
  maxTextLengthPerBlock({ ...TEAMS, limit: 40000 }),
  maxButtonsPerRow({ ...TEAMS, limit: 6 }),
];

export function validateTeamsCard(card: CardElement): IChatRenderValidation[] {
  return runCardValidators(card, TEAMS_VALIDATORS);
}
