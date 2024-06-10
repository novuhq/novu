import { expect } from '@jest/globals';
import { Echo } from './client';

import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

describe('client.validation', () => {
  it.only('test', () => {
    const zodSchema = z.object({
      subject: z.string(),
      body: z.string(),
      px: z.custom<`${number}px`>((val) => {
        return typeof val === 'string' ? /^\d+px$/.test(val) : false;
      }),
    });

    const jsonSchema = zodToJsonSchema(zodSchema);
    console.log(JSON.stringify(jsonSchema));
  });

  it('should support Zod on inputs', () => {
    const echo = new Echo();
    echo.workflow(
      'zod-validation',
      async ({ step, input, payload }) => {
        await step.email(
          'zod-validation',
          async (inputs) => ({
            subject: 'Test subject',
            body: 'Test body',
          }),
          {
            inputSchema: z.object({
              baz: z.string(),
              qux: z.string(),
            }),
            providers: {
              sendgrid: async (inputs) => ({
                ipPoolName: 'test',
              }),
            },
          }
        );
      },
      {
        inputSchema: z.object({
          foo: z.string(),
          bar: z.string(),
        }),
        payloadSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            foo: { type: 'string' },
            bar: { type: 'string' },
          },
          required: ['foo', 'bar'],
        } as const,
      }
    );
  });
});
