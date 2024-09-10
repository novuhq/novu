import { it, describe, expect } from 'vitest';
import { validateData } from '../../../validators';
import { digestActionSchemas } from './digest.schema';

describe('digest schema', () => {
  describe('output schema', () => {
    it('should validate regular digest', async () => {
      const schema = digestActionSchemas.output;

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

    it('should validate timed digest', async () => {
      const schema = digestActionSchemas.output;

      const data = {
        cron: '0 0-23/1 * * *',
      };

      const result = await validateData(schema, data);

      expect(result.success).toBe(true);
      expect(result.success && result.data).toEqual({
        cron: '0 0-23/1 * * *',
      });
    });
  });
});
