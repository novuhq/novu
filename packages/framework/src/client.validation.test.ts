import { beforeEach, describe, expect, it } from 'vitest';
import { Client } from './client';
import { PostActionEnum } from './constants';
import { ExecutionStateControlsInvalidError } from './errors';
import { workflow } from './resources/workflow';

describe('validation', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ secretKey: 'some-secret-key' });
  });

  const jsonSchema = {
    type: 'object',
    properties: {
      foo: { type: 'string' },
      baz: { type: 'number' },
    },
    required: ['foo', 'baz'],
    additionalProperties: false,
  } as const;

  it('should transform a JSON schema to a valid schema during discovery', async () => {
    await client.addWorkflows([
      workflow('json-schema-validation', async ({ step }) => {
        await step.email(
          'json-schema-validation',
          async () => ({
            subject: 'Test subject',
            body: 'Test body',
          }),
          {
            controlSchema: jsonSchema,
          }
        );
      }),
    ]);

    const discoverResult = client.discover();
    const stepControlSchema = discoverResult.workflows[0].steps[0].controls.schema;

    expect(stepControlSchema).to.deep.include(jsonSchema);
  });

  it('should throw an error if a property is missing', async () => {
    await client.addWorkflows([
      workflow('json-schema-validation', async ({ step }) => {
        await step.email(
          'test-email',
          async () => ({
            subject: 'Test subject',
            body: 'Test body',
          }),
          {
            controlSchema: jsonSchema,
          }
        );
      }),
    ]);

    try {
      await client.executeWorkflow({
        action: PostActionEnum.EXECUTE,
        workflowId: 'json-schema-validation',
        controls: {
          foo: '341',
        },
        payload: {},
        stepId: 'test-email',
        state: [],
        subscriber: {},
      });
    } catch (error) {
      expect(error).to.be.instanceOf(ExecutionStateControlsInvalidError);
      expect((error as ExecutionStateControlsInvalidError).message).to.equal(
        'Workflow with id: `json-schema-validation` has an invalid state. Step with id: `test-email` has invalid `controls`. Please provide the correct step controls.'
      );
      expect((error as ExecutionStateControlsInvalidError).data).to.deep.equal([
        {
          message: "must have required property 'baz'",
          path: '',
        },
      ]);
    }
  });
});
