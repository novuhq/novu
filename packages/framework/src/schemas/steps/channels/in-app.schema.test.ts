import { it, describe, expect } from 'vitest';
import { validateData } from '../../../validators';
import { inAppChannelSchemas } from './in-app.schema';

describe('in-app schema', () => {
  describe('output schema', () => {
    it('should set target to _self by default if url is relative', async () => {
      const schema = inAppChannelSchemas.output;

      const data = {
        body: 'Hello, world!',
        redirect: {
          url: '/foo',
        },
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(true);
      expect(result.success && result.data).toEqual({
        body: 'Hello, world!',
        redirect: { url: '/foo', target: '_self' },
      });
    });

    it('should set target to _blank by default if url is absolute', async () => {
      const schema = inAppChannelSchemas.output;

      const data = {
        body: 'Hello, world!',
        redirect: {
          url: 'https://example.com/foo',
        },
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(true);
      expect(result.success && result.data).toEqual({
        body: 'Hello, world!',
        redirect: { url: 'https://example.com/foo', target: '_blank' },
      });
    });
  });
});
