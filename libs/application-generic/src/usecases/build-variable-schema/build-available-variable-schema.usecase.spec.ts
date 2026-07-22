import { EnvironmentRepository, EnvironmentVariableRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateVariablesObject } from '../create-variables-object';
import { BuildVariableSchemaCommand } from './build-available-variable-schema.command';
import { BuildVariableSchemaUsecase } from './build-available-variable-schema.usecase';

describe('BuildVariableSchemaUsecase', () => {
  let createVariablesObjectMock: sinon.SinonStubbedInstance<CreateVariablesObject>;
  let environmentVariableRepositoryMock: sinon.SinonStubbedInstance<EnvironmentVariableRepository>;
  let environmentRepositoryMock: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let usecase: BuildVariableSchemaUsecase;

  beforeEach(() => {
    createVariablesObjectMock = sinon.createStubInstance(CreateVariablesObject);
    environmentVariableRepositoryMock = sinon.createStubInstance(EnvironmentVariableRepository);
    environmentRepositoryMock = sinon.createStubInstance(EnvironmentRepository);

    usecase = new BuildVariableSchemaUsecase(
      createVariablesObjectMock as any,
      {} as any,
      environmentVariableRepositoryMock as any,
      environmentRepositoryMock as any
    );

    createVariablesObjectMock.execute.resolves({
      payload: {},
      subscriber: {},
      actor: {},
      context: {},
    });
    environmentVariableRepositoryMock.findByEnvironment.resolves([]);
    environmentRepositoryMock.findByIdAndOrganization.resolves({ name: 'Development', type: 'dev' } as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should include HTTP response schema fields from optimistic step control values during sync', async () => {
    const httpStepId = 'http-request-step';
    const responseBodySchema = {
      type: 'object',
      properties: {
        type: { type: 'string' },
      },
      additionalProperties: false,
    };

    const schema = await usecase.execute(
      BuildVariableSchemaCommand.create({
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
        stepInternalId: undefined,
        optimisticSteps: [
          {
            stepId: httpStepId,
            type: StepTypeEnum.HTTP_REQUEST,
            controlValues: {
              method: 'GET',
              url: 'https://example.com',
              responseBodySchema,
            },
          },
          {
            stepId: 'push-step',
            type: StepTypeEnum.PUSH,
          },
        ],
        optimisticControlValues: {
          skip: {
            '==': [{ var: `steps.${httpStepId}.type` }, 'like'],
          },
        },
      })
    );

    const httpStepSchema = schema.properties?.steps?.properties?.[httpStepId];
    expect(httpStepSchema?.properties?.type).to.deep.equal({ type: 'string' });
  });

  it('should prefer in-flight optimistic control values over stale preloaded values during sync update', async () => {
    const httpStepInternalId = 'http-template-id';
    const httpStepId = 'http-request-step';
    const responseBodySchema = {
      type: 'object',
      properties: {
        type: { type: 'string' },
      },
      additionalProperties: false,
    };

    const schema = await usecase.execute(
      BuildVariableSchemaCommand.create({
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
        stepInternalId: 'push-template-id',
        workflow: {
          _id: 'workflow_id',
          steps: [
            {
              _id: httpStepInternalId,
              _templateId: httpStepInternalId,
              stepId: httpStepId,
              template: { type: StepTypeEnum.HTTP_REQUEST },
            },
            {
              _id: 'push-template-id',
              _templateId: 'push-template-id',
              stepId: 'push-step',
              template: { type: StepTypeEnum.PUSH },
            },
          ],
        },
        preloadedControlValues: [
          {
            _stepId: httpStepInternalId,
            controls: {
              method: 'GET',
              url: 'https://example.com',
              responseBodySchema: {
                type: 'object',
                properties: {},
                additionalProperties: true,
              },
            },
          } as any,
        ],
        optimisticSteps: [
          {
            stepId: httpStepId,
            type: StepTypeEnum.HTTP_REQUEST,
            _id: httpStepInternalId,
            controlValues: {
              method: 'GET',
              url: 'https://example.com',
              responseBodySchema,
            },
          },
          {
            stepId: 'push-step',
            type: StepTypeEnum.PUSH,
            _id: 'push-template-id',
          },
        ],
      })
    );

    const httpStepSchema = schema.properties?.steps?.properties?.[httpStepId];
    expect(httpStepSchema?.properties?.type).to.deep.equal({ type: 'string' });
  });
});
