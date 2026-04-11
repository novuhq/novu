import { describe, expect, it } from 'vitest';
import { validateData } from '../../../validators';
import { delayActionSchemas } from './delay.schema';

describe('delay schema', () => {
  describe('output schema', () => {
    it('should validate regular delay', async () => {
      const schema = delayActionSchemas.output;

      const data = {
        amount: 1,
        unit: 'seconds',
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(true);
      expect(result.success && result.data).toEqual({
        amount: 1,
        unit: 'seconds',
      });
    });

    it('should validate timed delay', async () => {
      const schema = delayActionSchemas.output;

      const data = {
        cron: '0 0-23/1 * * *',
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(true);
      expect(result.success && result.data).toEqual({
        cron: '0 0-23/1 * * *',
      });
    });

    it('should validate dynamic delay', async () => {
      const schema = delayActionSchemas.output;

      const data = {
        type: 'dynamic',
        dynamicKey: 'payload.sendAt',
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(true);
      expect(result.success && result.data).toEqual({
        type: 'dynamic',
        dynamicKey: 'payload.sendAt',
      });
    });

    it('should validate none delay', async () => {
      const schema = delayActionSchemas.output;

      const data = {
        type: 'none',
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(true);
      expect(result.success && result.data).toEqual({
        type: 'none',
      });
    });
  });
});
