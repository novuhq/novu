import sinon from 'sinon';
import { expect } from 'chai';
import {
  AnalyticsService,
  GetLayoutCommand as GetLayoutCommandV1,
  GetLayoutUseCase as GetLayoutUseCaseV1,
} from '@novu/application-generic';
import { ControlValuesRepository } from '@novu/dal';
import { ChannelTypeEnum, ControlValuesLevelEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';

import { GetLayoutUseCase } from './get-layout.use-case';
import { GetLayoutCommand } from './get-layout.command';
import { LayoutVariablesSchemaUseCase } from '../layout-variables-schema';

describe('GetLayoutUseCase', () => {
  let getLayoutUseCaseV1Mock: sinon.SinonStubbedInstance<GetLayoutUseCaseV1>;
  let controlValuesRepositoryMock: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let layoutVariablesSchemaUseCaseMock: sinon.SinonStubbedInstance<LayoutVariablesSchemaUseCase>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let getLayoutUseCase: GetLayoutUseCase;

  const mockUser = {
    _id: 'user_id',
    environmentId: 'env_id',
    organizationId: 'org_id',
  };

  const mockLayout = {
    _id: 'layout_id',
    identifier: 'layout_identifier',
    name: 'Test Layout',
    isDefault: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    channel: ChannelTypeEnum.EMAIL,
    controls: {
      dataSchema: {},
      uiSchema: {},
    },
  };

  const mockControlValues = {
    _id: 'control_values_id',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    _layoutId: 'layout_id',
    level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
    controls: {
      email: {
        body: '<html><body>{{content}}</body></html>',
      },
    },
  };

  const mockVariablesSchema = {
    type: 'object',
    properties: {
      body: {
        type: 'string',
      },
    },
  };

  beforeEach(() => {
    getLayoutUseCaseV1Mock = sinon.createStubInstance(GetLayoutUseCaseV1);
    controlValuesRepositoryMock = sinon.createStubInstance(ControlValuesRepository);
    layoutVariablesSchemaUseCaseMock = sinon.createStubInstance(LayoutVariablesSchemaUseCase);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);

    getLayoutUseCase = new GetLayoutUseCase(
      getLayoutUseCaseV1Mock as any,
      controlValuesRepositoryMock as any,
      layoutVariablesSchemaUseCaseMock as any,
      analyticsServiceMock as any
    );

    // Default mocks
    getLayoutUseCaseV1Mock.execute.resolves(mockLayout as any);
    controlValuesRepositoryMock.findOne.resolves(mockControlValues as any);
    layoutVariablesSchemaUseCaseMock.execute.resolves(mockVariablesSchema as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully get layout with control values', async () => {
      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      const result = await getLayoutUseCase.execute(command);

      expect(result).to.deep.include({
        _id: 'layout_id',
        layoutId: 'layout_identifier',
        name: 'Test Layout',
        isDefault: false,
        origin: ResourceOriginEnum.NOVU_CLOUD,
        type: ResourceTypeEnum.BRIDGE,
      });

      expect(result.controls).to.exist;
      expect(result.controls.values?.email).to.deep.equal(mockControlValues.controls.email);
      expect(result.variables).to.deep.equal(mockVariablesSchema);

      // Verify v1 use case was called with correct parameters
      expect(getLayoutUseCaseV1Mock.execute.calledOnce).to.be.true;
      const v1Command = getLayoutUseCaseV1Mock.execute.firstCall.args[0];
      expect(v1Command.layoutIdOrInternalId).to.equal('layout_identifier');
      expect(v1Command.environmentId).to.equal('env_id');
      expect(v1Command.organizationId).to.equal('org_id');
      expect(v1Command.type).to.equal(ResourceTypeEnum.BRIDGE);
      expect(v1Command.origin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
    });

    it('should get layout without control values when none exist', async () => {
      controlValuesRepositoryMock.findOne.resolves(null);

      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      const result = await getLayoutUseCase.execute(command);

      expect(result.controls.values).to.deep.equal({});
      expect(result.variables).to.deep.equal(mockVariablesSchema);

      // Verify control values repository was called with correct parameters
      expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.findOne.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env_id',
        _organizationId: 'org_id',
        _layoutId: 'layout_id',
        level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
      });
    });

    it('should call layout variables schema use case', async () => {
      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      await getLayoutUseCase.execute(command);

      expect(layoutVariablesSchemaUseCaseMock.execute.calledOnce).to.be.true;
      const schemaCommand = layoutVariablesSchemaUseCaseMock.execute.firstCall.args[0];
      expect(schemaCommand.environmentId).to.equal('env_id');
      expect(schemaCommand.organizationId).to.equal('org_id');
    });

    it('should track analytics event', async () => {
      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      await getLayoutUseCase.execute(command);

      expect(analyticsServiceMock.track.calledOnce).to.be.true;
      expect(analyticsServiceMock.track.firstCall.args[0]).to.equal('Get layout - [Layouts]');
      expect(analyticsServiceMock.track.firstCall.args[1]).to.equal('user_id');
      expect(analyticsServiceMock.track.firstCall.args[2]).to.deep.equal({
        _organizationId: 'org_id',
        _environmentId: 'env_id',
        layoutId: 'layout_id',
      });
    });

    it('should handle empty control values controls', async () => {
      const controlValuesWithEmptyControls = {
        ...mockControlValues,
        controls: undefined,
      };
      controlValuesRepositoryMock.findOne.resolves(controlValuesWithEmptyControls as any);

      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      const result = await getLayoutUseCase.execute(command);

      expect(result.controls.values).to.deep.equal({});
    });

    it('should pass through layout properties correctly', async () => {
      const defaultLayout = {
        ...mockLayout,
        isDefault: true,
        name: 'Default Layout',
      };
      getLayoutUseCaseV1Mock.execute.resolves(defaultLayout as any);

      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'default_layout',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      const result = await getLayoutUseCase.execute(command);

      expect(result.isDefault).to.be.true;
      expect(result.name).to.equal('Default Layout');
      expect(result.createdAt).to.equal('2023-01-01T00:00:00Z');
      expect(result.updatedAt).to.equal('2023-01-01T00:00:00Z');
    });

    it('should propagate error from v1 use case', async () => {
      const error = new Error('Layout not found');
      getLayoutUseCaseV1Mock.execute.rejects(error);

      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'non_existent',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      try {
        await getLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Layout not found');
      }
    });

    it('should propagate error from control values repository', async () => {
      const error = new Error('Database error');
      controlValuesRepositoryMock.findOne.rejects(error);

      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      try {
        await getLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Database error');
      }
    });

    it('should propagate error from layout variables schema use case', async () => {
      const error = new Error('Schema error');
      layoutVariablesSchemaUseCaseMock.execute.rejects(error);

      const command = GetLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        environmentId: 'env_id',
        organizationId: 'org_id',
        userId: 'user_id',
      });

      try {
        await getLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Schema error');
      }
    });
  });
});
