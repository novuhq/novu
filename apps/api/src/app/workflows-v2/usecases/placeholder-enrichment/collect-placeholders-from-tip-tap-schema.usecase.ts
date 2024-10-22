/* eslint-disable no-param-reassign,no-cond-assign */
// Importing necessary types
import { TipTapNode } from '@novu/shared';

// Define the PlaceholderMap type
export type PlaceholderMap = {
  for?: {
    [key: string]: string[];
  };
  show?: {
    [key: string]: any[];
  };
  regular?: {
    [key: string]: any[];
  };
};

// Define the command interface for parameters
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface CollectPlaceholdersCommand {
  node: TipTapNode;
}

// Create the main class with a UseCase suffix
export class CollectPlaceholdersFromTipTapSchemaUsecase {
  /**
   * The main entry point for executing the use case.
   *
   * @param {CollectPlaceholdersCommand} command - The command containing parameters.
   * @returns {PlaceholderMap} An object mapping main placeholders to their nested placeholders.
   */
  public execute(command: CollectPlaceholdersCommand): PlaceholderMap {
    const placeholders: Required<PlaceholderMap> = {
      for: {},
      show: {},
      regular: {},
    };

    this.traverse(command.node, placeholders);

    return placeholders;
  }

  private traverse(node: TipTapNode, placeholders: Required<PlaceholderMap>) {
    if (node.type === 'for' && node.attr) {
      this.handleForTraversal(node, placeholders);
    } else if (node.type === 'show' && node.attr && node.attr.when) {
      this.handleShowTraversal(node, placeholders);
    } else if (node.type === 'text' && node.text) {
      const regularPlaceholders = extractPlaceholders(node.text).filter(
        (placeholder) => !placeholder.startsWith('item')
      );
      for (const regularPlaceholder of regularPlaceholders) {
        placeholders.regular[regularPlaceholder] = [];
      }
    }

    if (node.content) {
      node.content.forEach((childNode) => this.traverse(childNode, placeholders));
    }
  }

  private handleForTraversal(node: TipTapNode, placeholders: Required<PlaceholderMap>) {
    if (node.type === 'show' && node.attr && typeof node.attr.each === 'string') {
      const mainPlaceholder = extractPlaceholders(node.attr.each);
      if (mainPlaceholder && mainPlaceholder.length === 1) {
        if (!placeholders.for[mainPlaceholder[0]]) {
          placeholders.for[mainPlaceholder[0]] = [];
        }

        if (node.content) {
          node.content.forEach((nestedNode) => {
            if (nestedNode.content) {
              nestedNode.content.forEach((childNode) => {
                if (childNode.type === 'text' && childNode.text) {
                  const nestedPlaceholders = extractPlaceholders(childNode.text);
                  for (const nestedPlaceholder of nestedPlaceholders) {
                    placeholders.for[mainPlaceholder[0]].push(nestedPlaceholder);
                  }
                }
              });
            }
          });
        }
      }
    }
  }

  private handleShowTraversal(node: TipTapNode, placeholders: Required<PlaceholderMap>) {
    if (node.type === 'show' && node.attr && typeof node.attr.when === 'string') {
      const nestedPlaceholders = extractPlaceholders(node.attr.when);
      placeholders.show[nestedPlaceholders[0]] = [];
    }
  }
}
export function extractPlaceholders(text: string): string[] {
  const regex = /\{\{\{(.*?)\}\}\}|\{\{(.*?)\}\}|\{#(.*?)#\}/g; // todo: add support for nested placeholders
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const placeholder = match[1] || match[2] || match[3];
    if (placeholder) {
      matches.push(placeholder.trim());
    }
  }

  return matches;
}
