import { CardElement, IChatRenderValidation } from '@novu/stateless';
import { CardPlatformLimits, InlineNode, mapCardText, validateCard } from '../card-render.utils';

/** Slack mrkdwn: `*bold*`, `_italic_`, `~strike~`, `` `code` ``, `<url|label>`. */
function inlineToSlack(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value;
        case 'code':
          return `\`${node.value}\``;
        case 'bold':
          return `*${inlineToSlack(node.children)}*`;
        case 'italic':
          return `_${inlineToSlack(node.children)}_`;
        case 'strike':
          return `~${inlineToSlack(node.children)}~`;
        case 'link': {
          const label = inlineToSlack(node.children);

          return node.url ? `<${node.url}|${label}>` : label;
        }
        default: {
          const exhaustiveCheck: never = node;

          return exhaustiveCheck;
        }
      }
    })
    .join('');
}

/** Slack Block Kit renders `text` blocks as mrkdwn; convert the card's markdown before serializing. */
export function toSlackFlavoredCard(card: CardElement): CardElement {
  return mapCardText(card, inlineToSlack);
}

const SLACK_LIMITS: CardPlatformLimits = {
  platform: 'Slack',
  maxBlocks: 50,
  maxTextLength: 3000,
  maxButtonsPerRow: 25,
};

export function validateSlackCard(card: CardElement): IChatRenderValidation[] {
  return validateCard(card, SLACK_LIMITS);
}

/** Slack rejects an `action_id` longer than 255 characters. */
const SLACK_ACTION_ID_MAX_LENGTH = 255;

/**
 * Slack requires every `action_id` in a message to be unique; otherwise it rejects the whole
 * payload with `invalid_blocks`. The Slack card serializer derives a link button's `action_id`
 * from its URL (`link-<url>`), so multiple buttons pointing at the same URL collide. Walk the
 * serialized blocks and suffix any repeated `action_id` to guarantee uniqueness (mutates in place;
 * `cardToBlockKit` returns freshly-built blocks).
 */
export function dedupeSlackActionIds(blocks: unknown[]): unknown[] {
  const usedActionIds = new Set<string>();

  const makeUnique = (actionId: string): string => {
    if (!usedActionIds.has(actionId)) {
      usedActionIds.add(actionId);

      return actionId;
    }

    let index = 1;
    let candidate: string;
    do {
      const suffix = `-${index}`;
      candidate = `${actionId.slice(0, SLACK_ACTION_ID_MAX_LENGTH - suffix.length)}${suffix}`;
      index += 1;
    } while (usedActionIds.has(candidate));

    usedActionIds.add(candidate);

    return candidate;
  };

  const applyToElement = (element: unknown) => {
    if (element && typeof element === 'object' && typeof (element as { action_id?: unknown }).action_id === 'string') {
      const el = element as { action_id: string };
      el.action_id = makeUnique(el.action_id);
    }
  };

  for (const block of blocks) {
    const elements = (block as { elements?: unknown[] })?.elements;

    if (Array.isArray(elements)) {
      elements.forEach(applyToElement);
    }

    applyToElement((block as { accessory?: unknown })?.accessory);
  }

  return blocks;
}
