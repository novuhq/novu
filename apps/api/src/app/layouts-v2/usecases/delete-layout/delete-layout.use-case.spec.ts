import sinon from 'sinon';
import { expect } from 'chai';
import { ConflictException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { LayoutRepository, ControlValuesRepository } from '@novu/dal';
import { ChannelTypeEnum, ControlValuesLevelEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';

import { DeleteLayoutUseCase } from './delete-layout.use-case';
import { DeleteLayoutCommand } from './delete-layout.command';
import { GetLayoutUseCase } from '../get-layout';

describe('DeleteLayoutUseCase', () => {
  let getLayoutUseCaseMock: sinon.SinonStubbedInstance<GetLayoutUseCase>;
  let layoutRepositoryMock: sinon.SinonStubbedInstance<LayoutRepository>;
  let controlValuesRepositoryMock: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let deleteLayoutUseCase: DeleteLayoutUseCase;

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
  };

  const mockDefaultLayout = {
    ...mockLayout,
    isDefault: true,
    name: 'Default Layout',
  };

  const mockStepControlValues = [
    {
      _id: 'step_control_1',
      _environmentId: 'env_id',
      _organizationId: 'org_id',
      level: ControlValuesLevelEnum.STEP_CONTROLS,
      controls: {
        email: {
          layoutId: 'layout_id',
          subject: 'Test Subject',
        },
      },
    },
    {
      _id: 'step_control_2',
      _environmentId: 'env_id',
      _organizationId: 'org_id',
      level: ControlValuesLevelEnum.STEP_CONTROLS,
      controls: {
        email: {
          layoutId: 'layout_id',
          body: 'Test Body',
        },
      },
    },
  ];

  beforeEach(() => {
    getLayoutUseCaseMock = sinon.createStubInstance(GetLayoutUseCase);
    layoutRepositoryMock = sinon.createStubInstance(LayoutRepository);
    controlValuesRepositoryMock = sinon.createStubInstance(ControlValuesRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);

    deleteLayoutUseCase = new DeleteLayoutUseCase(
      getLayoutUseCaseMock as any,
      layoutRepositoryMock as any,
      controlValuesRepositoryMock as any,
      analyticsServiceMock as any
    );

    // Default mocks
    getLayoutUseCaseMock.execute.resolves(mockLayout as any);
    controlValuesRepositoryMock.findMany.resolves(mockStepControlValues as any);
    controlValuesRepositoryMock.updateOne.resolves({} as any);
    controlValuesRepositoryMock.delete.resolves({} as any);
    layoutRepositoryMock.deleteLayout.resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully delete non-default layout', async () => {
      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        user: mockUser as any,
      });

      await deleteLayoutUseCase.execute(command);

      // Verify v1 use case was called with correct parameters
      expect(getLayoutUseCaseMock.execute.calledOnce).to.be.true;
      const getLayoutCommand = getLayoutUseCaseMock.execute.firstCall.args[0];
      expect(getLayoutCommand.layoutIdOrInternalId).to.equal('layout_identifier');
      expect(getLayoutCommand.environmentId).to.equal('env_id');
      expect(getLayoutCommand.organizationId).to.equal('org_id');
      expect(getLayoutCommand.skipAdditionalFields).to.be.true;

      // Verify layout was deleted from repository
      expect(layoutRepositoryMock.deleteLayout.calledOnce).to.be.true;
      expect(layoutRepositoryMock.deleteLayout.firstCall.args).to.deep.equal(['layout_id', 'env_id', 'org_id']);

      // Verify control values were deleted
      expect(controlValuesRepositoryMock.delete.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.delete.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env_id',
        _organizationId: 'org_id',
        _layoutId: 'layout_id',
        level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
      });
    });

    it('should throw ConflictException when trying to delete default layout', async () => {
      getLayoutUseCaseMock.execute.resolves(mockDefaultLayout as any);

      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'default_layout',
        user: mockUser as any,
      });

      try {
        await deleteLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(ConflictException);
        expect(error.message).to.include('is being used as a default layout, it can not be deleted');
      }

      // Verify layout was not deleted
      expect(layoutRepositoryMock.deleteLayout.called).to.be.false;
    });

    it('should remove layout references from step controls', async () => {
      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        user: mockUser as any,
      });

      await deleteLayoutUseCase.execute(command);

      // Verify findMany was called to get step controls
      expect(controlValuesRepositoryMock.findMany.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.findMany.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env_id',
        _organizationId: 'org_id',
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        'controls.layoutId': 'layout_id',
      });

      // Verify updateOne was called for each step control
      expect(controlValuesRepositoryMock.updateOne.callCount).to.equal(2);

      // Check first update call
      expect(controlValuesRepositoryMock.updateOne.firstCall.args[0]).to.deep.equal({
        _id: 'step_control_1',
        _environmentId: 'env_id',
        _organizationId: 'org_id',
      });
      expect(controlValuesRepositoryMock.updateOne.firstCall.args[1]).to.deep.equal({
        $unset: { 'controls.layoutId': '' },
      });

      // Check second update call
      expect(controlValuesRepositoryMock.updateOne.secondCall.args[0]).to.deep.equal({
        _id: 'step_control_2',
        _environmentId: 'env_id',
        _organizationId: 'org_id',
      });
      expect(controlValuesRepositoryMock.updateOne.secondCall.args[1]).to.deep.equal({
        $unset: { 'controls.layoutId': '' },
      });
    });

    it('should handle case where no step controls reference the layout', async () => {
      controlValuesRepositoryMock.findMany.resolves([]);

      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        user: mockUser as any,
      });

      await deleteLayoutUseCase.execute(command);

      // Verify findMany was still called
      expect(controlValuesRepositoryMock.findMany.calledOnce).to.be.true;

      // Verify updateOne was not called since no step controls exist
      expect(controlValuesRepositoryMock.updateOne.called).to.be.false;

      // Verify layout was still deleted
      expect(layoutRepositoryMock.deleteLayout.calledOnce).to.be.true;
    });

    it('should track analytics event', async () => {
      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        user: mockUser as any,
      });

      await deleteLayoutUseCase.execute(command);

      expect(analyticsServiceMock.track.calledOnce).to.be.true;
      expect(analyticsServiceMock.track.firstCall.args[0]).to.equal('Delete layout - [Layouts]');
      expect(analyticsServiceMock.track.firstCall.args[1]).to.equal('user_id');
      expect(analyticsServiceMock.track.firstCall.args[2]).to.deep.equal({
        _organizationId: 'org_id',
        _environmentId: 'env_id',
        layoutId: 'layout_id',
      });
    });

    it('should propagate error from v1 use case', async () => {
      const error = new Error('Layout not found');
      getLayoutUseCaseMock.execute.rejects(error);

      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'non_existent',
        user: mockUser as any,
      });

      try {
        await deleteLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Layout not found');
      }
    });

    it('should propagate error from step controls cleanup', async () => {
      const error = new Error('Database error');
      controlValuesRepositoryMock.findMany.rejects(error);

      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        user: mockUser as any,
      });

      try {
        await deleteLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Database error');
      }
    });

    it('should propagate error from step controls update', async () => {
      const error = new Error('Update error');
      controlValuesRepositoryMock.updateOne.rejects(error);

      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        user: mockUser as any,
      });

      try {
        await deleteLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Update error');
      }
    });

    it('should propagate error from layout deletion', async () => {
      const error = new Error('Delete error');
      layoutRepositoryMock.deleteLayout.rejects(error);

      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        user: mockUser as any,
      });

      try {
        await deleteLayoutUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Delete error');
      }
    });

    it('should validate deletion order: step controls cleanup before layout deletion', async () => {
      const command = DeleteLayoutCommand.create({
        layoutIdOrInternalId: 'layout_identifier',
        user: mockUser as any,
      });

      await deleteLayoutUseCase.execute(command);

      // Verify step controls operations were called before layout deletion
      expect(controlValuesRepositoryMock.findMany.calledBefore(layoutRepositoryMock.deleteLayout)).to.be.true;
      expect(controlValuesRepositoryMock.updateOne.calledBefore(layoutRepositoryMock.deleteLayout)).to.be.true;
    });
  });
});
