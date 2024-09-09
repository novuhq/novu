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

    it('should throw an error if the url is not a valid absolute or relative url', async () => {
      const schema = inAppChannelSchemas.output;

      const data = {
        body: 'Hello, world!',
        redirect: {
          url: 'foo',
        },
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(false);
      expect(result.success === false && result.errors).toEqual([
        {
          message: 'must match pattern "^(?!mailto:)(?:(https?):\\/\\/[^\\s/$.?#].[^\\s]*)|^(\\/[^\\s]*)$"',
          path: '/redirect/url',
        },
      ]);
    });

    it('should throw an error if the redirect target is not a valid value', async () => {
      const schema = inAppChannelSchemas.output;

      const data = {
        body: 'Hello, world!',
        redirect: {
          url: '/foo',
          target: 'foo',
        },
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(false);
      expect(result.success === false && result.errors).toEqual([
        {
          message: 'must be equal to one of the allowed values',
          path: '/redirect/target',
        },
      ]);
    });
  });
});
