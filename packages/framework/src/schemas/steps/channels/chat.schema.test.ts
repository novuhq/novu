import { describe, expect, it } from 'vitest';
import { validateData } from '../../../validators';
import { chatChannelSchemas } from './chat.schema';

describe('chat schema', () => {
  describe('output schema', () => {
    it('accepts a v1 card with link-button actions', async () => {
      const result = await validateData(chatChannelSchemas.output, {
        card: {
          type: 'card',
          title: 'Deploy finished',
          children: [
            { type: 'text', content: 'All checks passed' },
            {
              type: 'actions',
              children: [{ type: 'link-button', label: 'View', url: 'https://novu.co' }],
            },
          ],
        },
      });

      expect(result.success).toBe(true);
    });

    it('accepts Chat SDK presentational children (section, fields, table)', async () => {
      const result = await validateData(chatChannelSchemas.output, {
        card: {
          type: 'card',
          children: [
            {
              type: 'section',
              children: [
                { type: 'text', content: 'Nested' },
                {
                  type: 'fields',
                  children: [{ type: 'field', label: 'Env', value: 'prod' }],
                },
              ],
            },
            {
              type: 'table',
              headers: ['Name', 'Status'],
              rows: [['api', 'ok']],
              align: ['left', 'center'],
            },
          ],
        },
      });

      expect(result.success).toBe(true);
    });

    it('accepts interactive actions children (button, select, radio_select)', async () => {
      const result = await validateData(chatChannelSchemas.output, {
        card: {
          type: 'card',
          children: [
            {
              type: 'actions',
              children: [
                { type: 'button', id: 'approve', label: 'Approve', style: 'primary' },
                {
                  type: 'select',
                  id: 'env',
                  label: 'Environment',
                  options: [
                    { label: 'Prod', value: 'prod' },
                    { label: 'Staging', value: 'staging' },
                  ],
                },
                {
                  type: 'radio_select',
                  id: 'priority',
                  label: 'Priority',
                  options: [{ label: 'High', value: 'high' }],
                },
              ],
            },
          ],
        },
      });

      expect(result.success).toBe(true);
    });

    it('rejects an unknown card child type', async () => {
      const result = await validateData(chatChannelSchemas.output, {
        card: {
          type: 'card',
          children: [{ type: 'modal', title: 'Nope' }],
        },
      });

      expect(result.success).toBe(false);
    });

    it('accepts body-only output without a card', async () => {
      const result = await validateData(chatChannelSchemas.output, {
        body: 'Hello from chat',
      });

      expect(result.success).toBe(true);
    });
  });
});
