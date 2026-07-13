import { AnalyticsService, GetLayoutUseCaseV0, PinoLogger } from '@novu/application-generic';
import { ChangeRepository, LayoutRepository } from '@novu/dal';
import { ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateDefaultLayoutChangeUseCase } from '../create-default-layout-change/create-default-layout-change.usecase';
import { SetDefaultLayoutCommand } from './set-default-layout.command';
import { SetDefaultLayoutUseCase } from './set-default-layout.use-case';

describe('SetDefaultLayoutUseCase', () => {
  let getLayoutUseCaseMock: sinon.SinonStubbedInstance<GetLayoutUseCaseV0>;
  let createDefaultLayoutChangeMock: sinon.SinonStubbedInstance<CreateDefaultLayoutChangeUseCase>;
  let layoutRepositoryMock: sinon.SinonStubbedInstance<LayoutRepository>;
  let changeRepositoryMock: sinon.SinonStubbedInstance<ChangeRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let pinoLoggerMock: sinon.SinonStubbedInstance<PinoLogger>;
  let setDefaultLayoutUseCase: SetDefaultLayoutUseCase;

  const mockSession = { id: 'session_id' };
  const command = SetDefaultLayoutCommand.create({
    layoutId: 'new_layout_id',
    userId: 'user_id',
    environmentId: 'environment_id',
    organizationId: 'organization_id',
  });

  beforeEach(() => {
    getLayoutUseCaseMock = sinon.createStubInstance(GetLayoutUseCaseV0);
    createDefaultLayoutChangeMock = sinon.createStubInstance(CreateDefaultLayoutChangeUseCase);
    layoutRepositoryMock = sinon.createStubInstance(LayoutRepository);
    changeRepositoryMock = sinon.createStubInstance(ChangeRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    pinoLoggerMock = sinon.createStubInstance(PinoLogger);

    setDefaultLayoutUseCase = new SetDefaultLayoutUseCase(
      getLayoutUseCaseMock as any,
      createDefaultLayoutChangeMock as any,
      layoutRepositoryMock as any,
      changeRepositoryMock as any,
      analyticsServiceMock as any,
      pinoLoggerMock as any
    );

    getLayoutUseCaseMock.execute.resolves({ _id: 'new_layout_id' } as any);
    layoutRepositoryMock.findOne.resolves({ _id: 'previous_layout_id' } as any);
    layoutRepositoryMock.updateIsDefault.resolves();
    layoutRepositoryMock.withTransaction.callsFake(async (callback: any) => await callback(mockSession));
    changeRepositoryMock.getParentId.resolves(null);
    changeRepositoryMock.getChangeId.resolves('previous_change_id');
    createDefaultLayoutChangeMock.execute.resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should update default flags and change records in one transaction', async () => {
    await setDefaultLayoutUseCase.execute(command);

    expect(layoutRepositoryMock.withTransaction.calledOnce).to.be.true;
    expect(layoutRepositoryMock.updateIsDefault.firstCall.args).to.deep.equal([
      'previous_layout_id',
      'environment_id',
      'organization_id',
      false,
      { session: mockSession },
    ]);
    expect(layoutRepositoryMock.updateIsDefault.secondCall.args).to.deep.equal([
      'new_layout_id',
      'environment_id',
      'organization_id',
      true,
      { session: mockSession },
    ]);
    expect(createDefaultLayoutChangeMock.execute.callCount).to.equal(2);
    expect(createDefaultLayoutChangeMock.execute.firstCall.args[1]).to.equal(mockSession);
    expect(createDefaultLayoutChangeMock.execute.secondCall.args[1]).to.equal(mockSession);
    expect(analyticsServiceMock.track.calledOnce).to.be.true;
  });

  it('should propagate a change-record failure and not report success', async () => {
    const error = new Error('Failed to create change record');
    createDefaultLayoutChangeMock.execute.onSecondCall().rejects(error);

    try {
      await setDefaultLayoutUseCase.execute(command);
      expect.fail('Should have thrown an error');
    } catch (thrownError) {
      expect(thrownError).to.equal(error);
      expect(analyticsServiceMock.track.called).to.be.false;
    }
  });

  it('should set a v2 layout as default without creating legacy change records', async () => {
    const v2Command = SetDefaultLayoutCommand.create({
      ...command,
      type: ResourceTypeEnum.BRIDGE,
      origin: ResourceOriginEnum.NOVU_CLOUD,
    });

    await setDefaultLayoutUseCase.execute(v2Command);

    expect(layoutRepositoryMock.updateIsDefault.secondCall.args).to.deep.equal([
      'new_layout_id',
      'environment_id',
      'organization_id',
      true,
      { session: mockSession },
    ]);
    expect(createDefaultLayoutChangeMock.execute.called).to.be.false;
  });
});
