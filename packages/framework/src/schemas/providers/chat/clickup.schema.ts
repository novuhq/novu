import type { JsonSchema } from '../../../types/schema.types';

/**
 * ClickUp chat provider output schema
 *
 * Supports two operations based on customData:
 * - Create a comment on a task (requires taskId)
 * - Create a new task in a list (requires listId)
 *
 * @see https://developer.clickup.com/docs/Getting%20Started
 */
const clickupOutputSchema = {
  type: 'object',
  properties: {
    taskId: {
      type: 'string',
      description: 'The ID of the task to add a comment to',
    },
    listId: {
      type: 'string',
      description: 'The ID of the list to create a task in',
    },
    comment_text: {
      type: 'string',
      description: 'The text content of the comment (used when taskId is provided)',
    },
    name: {
      type: 'string',
      description: 'The name of the new task (used when listId is provided)',
    },
    markdown_description: {
      type: 'string',
      description: 'Markdown description of the new task (used when listId is provided)',
    },
    notify_all: {
      type: 'boolean',
      description: 'Whether to notify all members',
    },
  },
  additionalProperties: true,
} as const satisfies JsonSchema;

export const clickupProviderSchemas = {
  output: clickupOutputSchema,
};
