import { IntegrationRepository } from '@novu/dal';
import type { IConfigurations } from '@novu/shared';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ConfigurationsDto } from './configurations.dto';

describe('integration configurations', () => {
  const payloadSchema = JSON.stringify({
    type: 'object',
    properties: { event: { type: 'string' } },
  });

  it('accepts a JSON Schema string in the API contract', async () => {
    const configurations = Object.assign(new ConfigurationsDto(), { payloadSchema });

    expect(await validate(configurations)).toEqual([]);
  });

  it('represents and persists a webhook payload schema string', () => {
    const configurations: IConfigurations = {
      payloadSchema,
    };
    const repository = new IntegrationRepository();
    const integration = new repository._model({ configurations });

    expect(integration.toObject().configurations?.payloadSchema).toBe(configurations.payloadSchema);
  });
});
