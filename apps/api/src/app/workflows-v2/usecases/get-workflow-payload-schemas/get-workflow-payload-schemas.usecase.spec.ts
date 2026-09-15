import { NotificationTemplateRepository } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetWorkflowPayloadSchemasCommand } from './get-workflow-payload-schemas.command';
import { GetWorkflowPayloadSchemasUseCase } from './get-workflow-payload-schemas.usecase';

describe('GetWorkflowPayloadSchemasUseCase', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns only defined payload schemas for the environment', async () => {
    const repository = sinon.createStubInstance(NotificationTemplateRepository);
    const usecase = new GetWorkflowPayloadSchemasUseCase(repository);
    const emailSchema = { type: 'object' as const, properties: { email: { type: 'string' as const } } };
    const retrySchema = { type: 'object' as const, properties: { retries: { type: 'number' as const } } };
    repository.find.resolves([
      { payloadSchema: emailSchema },
      { payloadSchema: undefined },
      { payloadSchema: retrySchema },
    ] as never);

    const result = await usecase.execute(
      GetWorkflowPayloadSchemasCommand.create({
        environmentId: 'environment-id',
        organizationId: 'organization-id',
      })
    );

    expect(
      repository.find.calledOnceWithExactly(
        {
          _environmentId: 'environment-id',
          _organizationId: 'organization-id',
        },
        'payloadSchema'
      )
    ).to.equal(true);
    expect(result.payloadSchemas).to.deep.equal([emailSchema, retrySchema]);
  });
});
