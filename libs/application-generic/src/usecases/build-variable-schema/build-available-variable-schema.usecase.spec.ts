import { ControlValuesRepository, EnvironmentRepository, EnvironmentVariableRepository } from '@novu/dal';
import { EnvironmentTypeEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateVariablesObject } from '../create-variables-object';
import { BuildVariableSchemaCommand } from './build-available-variable-schema.command';
import { BuildVariableSchemaUsecase } from './build-available-variable-schema.usecase';

describe('BuildVariableSchemaUsecase', () => {
  let createVariablesObjectMock: sinon.SinonStubbedInstance<CreateVariablesObject>;
  let controlValuesRepositoryMock: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let environmentVariableRepositoryMock: sinon.SinonStubbedInstance<EnvironmentVariableRepository>;
  let environmentRepositoryMock: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let usecase: BuildVariableSchemaUsecase;

  beforeEach(() => {
    createVariablesObjectMock = sinon.createStubInstance(CreateVariablesObject);
    controlValuesRepositoryMock = sinon.createStubInstance(ControlValuesRepository);
    environmentVariableRepositoryMock = sinon.createStubInstance(EnvironmentVariableRepository);
    environmentRepositoryMock = sinon.createStubInstance(EnvironmentRepository);

    usecase = new BuildVariableSchemaUsecase(
      createVariablesObjectMock as any,
      controlValuesRepositoryMock as any,
      environmentVariableRepositoryMock as any,
      environmentRepositoryMock as any
    );

    createVariablesObjectMock.execute.resolves({
      payload: {},
      subscriber: {},
      actor: {},
      context: {},
    });
    controlValuesRepositoryMock.find.resolves([]);
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

  it('loads environment data when no environment context is preloaded', async () => {
    await usecase.execute(
      BuildVariableSchemaCommand.create({
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
        workflow: {
          _id: 'workflow_id',
          steps: [],
        },
      })
    );

    expect(environmentVariableRepositoryMock.findByEnvironment.calledOnce).to.equal(true);
    expect(environmentRepositoryMock.findByIdAndOrganization.calledOnce).to.equal(true);
  });

  it('uses a preloaded environment context without querying environment data', async () => {
    const schema = await usecase.execute(
      BuildVariableSchemaCommand.create({
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
        workflow: {
          _id: 'workflow_id',
          steps: [],
        },
        preloadedEnvironmentContext: {
          rawEnvVars: [{ key: 'API_URL', value: 'https://example.com', isSecret: false }],
          environment: { name: 'Production', type: EnvironmentTypeEnum.PROD },
        },
      })
    );

    expect(environmentVariableRepositoryMock.findByEnvironment.called).to.equal(false);
    expect(environmentRepositoryMock.findByIdAndOrganization.called).to.equal(false);
    expect(schema.properties?.env?.properties?.API_URL).to.deep.equal({
      type: 'string',
      description: 'Environment variable: API_URL',
    });
    expect(schema.properties?.env?.properties?.name).to.deep.equal({
      type: 'string',
      description: 'Environment variable: name',
    });
    expect(schema.properties?.env?.properties?.type).to.deep.equal({
      type: 'string',
      description: 'Environment variable: type',
    });
  });
});
