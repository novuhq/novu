import sinon from 'sinon';
import { expect } from 'chai';
import {
  AnalyticsService,
  GetLayoutCommand as GetLayoutCommandV1,
  GetLayoutUseCase as GetLayoutUseCaseV1,
} from '@novu/application-generic';
import { ControlValuesRepository } from '@novu/dal';
import { ChannelTypeEnum, ControlValuesLevelEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';

import { DuplicateLayoutUseCase } from './duplicate-layout.use-case';
import { DuplicateLayoutCommand } from './duplicate-layout.command';
import { UpsertLayoutUseCase } from '../upsert-layout';

describe('DuplicateLayoutUseCase', () => {
  let getLayoutUseCaseV1Mock: sinon.SinonStubbedInstance<GetLayoutUseCaseV1>;
  let upsertLayoutUseCaseMock: sinon.SinonStubbedInstance<UpsertLayoutUseCase>;
  let controlValuesRepositoryMock: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let duplicateLayoutUseCase: DuplicateLayoutUseCase;

  const mockUser = {
    _id: 'user_id',
    environmentId: 'env_id',
    organizationId: 'org_id',
  };

  const mockOriginalLayout = {
    _id: 'original_layout_id',
    identifier: 'original_layout_identifier',
    name: 'Original Layout',
    isDefault: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    channel: ChannelTypeEnum.EMAIL,
  };

  const mockOriginalControlValues = {
    _id: 'original_control_values_id',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    _layoutId: 'original_layout_id',
    level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
    controls: {
      email: {
        content: '<html><body>{{content}}</body></html>',
        subject: 'Original Subject',
      },
    },
  };

  const mockDuplicatedLayout = {
    _id: 'duplicated_layout_id',
    layoutId: 'duplicated_layout_identifier',
    name: 'Duplicated Layout',
    isDefault: false,
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    controls: {
      schema: {},
      values: {
        email: mockOriginalControlValues.controls.email,
      },
    },
  };

  const mockOverrides = {
    name: 'Duplicated Layout',
  };

  beforeEach(() => {
    getLayoutUseCaseV1Mock = sinon.createStubInstance(GetLayoutUseCaseV1);
    upsertLayoutUseCaseMock = sinon.createStubInstance(UpsertLayoutUseCase);
    controlValuesRepositoryMock = sinon.createStubInstance(ControlValuesRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);

    duplicateLayoutUseCase = new DuplicateLayoutUseCase(
      getLayoutUseCaseV1Mock as any,
      upsertLayoutUseCaseMock as any,
      controlValuesRepositoryMock as any,
      analyticsServiceMock as any
    );

    // Default mocks
    getLayoutUseCaseV1Mock.execute.resolves(mockOriginalLayout as any);
    controlValuesRepositoryMock.findOne.resolves(mockOriginalControlValues as any);
    upsertLayoutUseCaseMock.execute.resolves(mockDuplicatedLayout as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully duplicate layout with control values', async () => {
      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      const result = await duplicateLayoutUseCase.execute(command);

      expect(result).to.deep.equal(mockDuplicatedLayout);

      // Verify v1 use case was called with correct parameters
      expect(getLayoutUseCaseV1Mock.execute.calledOnce).to.be.true;
      const v1Command = getLayoutUseCaseV1Mock.execute.firstCall.args[0];
      expect(v1Command.layoutIdOrInternalId).to.equal('original_layout_identifier');
      expect(v1Command.environmentId).to.equal('env_id');
      expect(v1Command.organizationId).to.equal('org_id');
      expect(v1Command.type).to.equal(ResourceTypeEnum.BRIDGE);
      expect(v1Command.origin).to.equal(ResourceOriginEnum.NOVU_CLOUD);

      // Verify control values repository was called
      expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.findOne.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env_id',
        _organizationId: 'org_id',
        _layoutId: 'original_layout_id',
        level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
      });

      // Verify upsert use case was called with correct parameters
      expect(upsertLayoutUseCaseMock.execute.calledOnce).to.be.true;
      const upsertCommand = upsertLayoutUseCaseMock.execute.firstCall.args[0];
      expect(upsertCommand.layoutDto.name).to.equal('Duplicated Layout');
      expect(upsertCommand.layoutDto.controlValues).to.deep.equal(mockOriginalControlValues.controls);
      expect(upsertCommand.user).to.deep.equal(mockUser);
    });

    it('should duplicate layout without control values when none exist', async () => {
      controlValuesRepositoryMock.findOne.resolves(null);

      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      const result = await duplicateLayoutUseCase.execute(command);

      expect(result).to.deep.equal(mockDuplicatedLayout);

      // Verify control values repository was called
      expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;

      // Verify upsert use case was called with null control values
      expect(upsertLayoutUseCaseMock.execute.calledOnce).to.be.true;
      const upsertCommand = upsertLayoutUseCaseMock.execute.firstCall.args[0];
      expect(upsertCommand.layoutDto.controlValues).to.be.null;
    });

    it('should handle empty control values controls', async () => {
      const controlValuesWithEmptyControls = {
        ...mockOriginalControlValues,
        controls: undefined,
      };
      controlValuesRepositoryMock.findOne.resolves(controlValuesWithEmptyControls as any);

      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      const result = await duplicateLayoutUseCase.execute(command);

      expect(result).to.deep.equal(mockDuplicatedLayout);

      // Verify upsert use case was called with null control values
      expect(upsertLayoutUseCaseMock.execute.calledOnce).to.be.true;
      const upsertCommand = upsertLayoutUseCaseMock.execute.firstCall.args[0];
      expect(upsertCommand.layoutDto.controlValues).to.be.null;
    });

    it('should track analytics event', async () => {
      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      await duplicateLayoutUseCase.execute(command);

      expect(analyticsServiceMock.track.calledOnce).to.be.true;
      expect(analyticsServiceMock.track.firstCall.args[0]).to.equal('Duplicate layout - [Layouts]');
      expect(analyticsServiceMock.track.firstCall.args[1]).to.equal('user_id');
      expect(analyticsServiceMock.track.firstCall.args[2]).to.deep.equal({
        _organizationId: 'org_id',
        _environmentId: 'env_id',
        originalLayoutId: 'original_layout_id',
        duplicatedLayoutId: 'duplicated_layout_id',
      });
    });

    it('should use override name correctly', async () => {
      const customOverrides = {
        name: 'Custom Duplicated Name',
      };

      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: customOverrides,
        user: mockUser as any,
      });

      await duplicateLayoutUseCase.execute(command);

      expect(upsertLayoutUseCaseMock.execute.calledOnce).to.be.true;
      const upsertCommand = upsertLayoutUseCaseMock.execute.firstCall.args[0];
      expect(upsertCommand.layoutDto.name).to.equal('Custom Duplicated Name');
    });

    it('should propagate error from v1 use case', async () => {
      const error = new Error('Layout not found');
      getLayoutUseCaseV1Mock.execute.rejects(error);

      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'non_existent',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      try {
        await duplicateLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Layout not found');
      }
    });

    it('should propagate error from control values repository', async () => {
      const error = new Error('Database error');
      controlValuesRepositoryMock.findOne.rejects(error);

      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      try {
        await duplicateLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Database error');
      }
    });

    it('should propagate error from upsert use case', async () => {
      const error = new Error('Upsert error');
      upsertLayoutUseCaseMock.execute.rejects(error);

      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      try {
        await duplicateLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Upsert error');
      }
    });

    it('should validate execution order: get original before duplicate creation', async () => {
      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      await duplicateLayoutUseCase.execute(command);

      // Verify original layout was fetched before duplication
      expect(getLayoutUseCaseV1Mock.execute.calledBefore(upsertLayoutUseCaseMock.execute)).to.be.true;
      expect(controlValuesRepositoryMock.findOne.calledBefore(upsertLayoutUseCaseMock.execute)).to.be.true;
    });

    it('should preserve original layout control values structure', async () => {
      const complexControlValues = {
        ...mockOriginalControlValues,
        controls: {
          email: {
            content: '<html><head><style>body { margin: 0; }</style></head><body>{{content}}</body></html>',
            subject: 'Complex Subject {{payload.name}}',
            preheader: 'Preview text',
            customField: 'custom value',
          },
        },
      };
      controlValuesRepositoryMock.findOne.resolves(complexControlValues as any);

      const command = DuplicateLayoutCommand.create({
        layoutIdOrInternalId: 'original_layout_identifier',
        overrides: mockOverrides,
        user: mockUser as any,
      });

      await duplicateLayoutUseCase.execute(command);

      expect(upsertLayoutUseCaseMock.execute.calledOnce).to.be.true;
      const upsertCommand = upsertLayoutUseCaseMock.execute.firstCall.args[0];
      expect(upsertCommand.layoutDto.controlValues).to.deep.equal(complexControlValues.controls);
    });
  });
});
