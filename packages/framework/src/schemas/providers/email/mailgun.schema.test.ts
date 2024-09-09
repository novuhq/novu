import { it, describe, expect } from 'vitest';
import { validateData } from '../../../validators';
import { mailgunProviderSchemas } from './mailgun.schema';

describe('mailgun schema', () => {
  it('should successfully validate a to field using a string', async () => {
    const schema = mailgunProviderSchemas.output;

    const data = {
      to: 'test@example.com',
    };

    const result = await validateData(schema, data);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      to: 'test@example.com',
    });
  });

  it('should successfully validate a to field using an array', async () => {
    const schema = mailgunProviderSchemas.output;

    const data = {
      to: ['test@example.com', 'test2@example.com'],
    };

    const result = await validateData(schema, data);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      to: ['test@example.com', 'test2@example.com'],
    });
  });
});
