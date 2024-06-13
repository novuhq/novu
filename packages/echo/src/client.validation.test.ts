import { expect } from '@jest/globals';
import { Echo } from './client';
jest.retryTimes(0);
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

const zodSchema = z.object({
  showButton: z.boolean().default(true),
  username: z.string().default('alanturing'),
  userImage: z.string().url().default('https://react-email-demo-bdj5iju9r-resend.vercel.app/static/vercel-user.png'),
  invitedByUsername: z.string().default('Alan'),
  invitedByEmail: z.string().email().default('alan.turing@example.com'),
  teamName: z.string().default('Team Awesome'),
  teamImage: z.string().default('https://react-email-demo-bdj5iju9r-resend.vercel.app/static/vercel-team.png'),
  inviteLink: z.string().url().default('https://vercel.com/teams/invite/foo'),
  inviteFromIp: z.string().default('204.13.186.218'),
  inviteFromLocation: z.string().default('São Paulo, Brazil'),
});

describe('client.validation', () => {
  it('test', () => {
    /*
     * const zodSchema = z.object({
     *   subject: z.string(),
     *   body: z.string(),
     *   px: z.custom<`${number}px`>((val) => {
     *     return typeof val === 'string' ? /^\d+px$/.test(val) : false;
     *   }),
     * });
     */

    const jsonSchema = zodToJsonSchema(zodSchema);
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
            inputSchema: zodSchema,
            providers: {
              sendgrid: async (inputs) => ({
                ipPoolName: 'test',
              }),
            },
          }
        );
      },
      {
        inputSchema: zodSchema,
      }
    );
  });

  it.only('should throw an error if the input is invalid', () => {
    const echo = new Echo();

    echo.workflow('zod-validation', async ({ step, input, payload }) => {
      await step.email(
        'zod-validation',
        async (inputs) => ({
          subject: 'Test subject',
          body: 'Test body',
        }),
        {
          inputSchema: z.object({
            foo: z.string(),
            baz: z.string(),
          }),
          providers: {
            sendgrid: async (inputs) => ({
              ipPoolName: 'test',
            }),
          },
        }
      );
    });

    expect(() =>
      echo.executeWorkflow({
        action: 'execute',
        workflowId: 'zod-validation',
        inputs: {
          baz: 'qux',
        },
        data: {},
        stepId: 'zod-validation',
        state: [],
        subscriber: {},
      })
    ).toThrow();
  });
});
