import { JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CancelDelayed } from './cancel-delayed.usecase';

describe('CancelDelayed step_runs_v2 writes', () => {
  const mainDigestJob = {
    _id: 'main_digest',
    _environmentId: 'env_1',
    _organizationId: 'org_1',
    _subscriberId: 'subscriber_1',
    type: StepTypeEnum.DIGEST,
    status: JobStatusEnum.DELAYED,
  };
  const followerDigestJob = {
    _id: 'follower_digest',
    _environmentId: 'env_1',
    _organizationId: 'org_1',
    _subscriberId: 'subscriber_1',
    type: StepTypeEnum.DIGEST,
    status: JobStatusEnum.MERGED,
  };
  const followerChildJob = { _id: 'follower_child', _environmentId: 'env_1', status: JobStatusEnum.MERGED };

  let jobRepository: {
    find: sinon.SinonStub;
    findOne: sinon.SinonStub;
    update: sinon.SinonStub;
    updateAllChildJobStatus: sinon.SinonStub;
  };
  let stepRunV2Writer: { write: sinon.SinonStub; writeMany: sinon.SinonStub };
  let usecase: CancelDelayed;

  beforeEach(() => {
    jobRepository = {
      find: sinon.stub(),
      findOne: sinon.stub().resolves(followerDigestJob),
      update: sinon.stub().resolves({ matched: 1, modified: 1 }),
      updateAllChildJobStatus: sinon.stub().resolves([followerChildJob]),
    };
    jobRepository.find.onFirstCall().resolves([mainDigestJob]);
    jobRepository.find.resolves([]);
    stepRunV2Writer = { write: sinon.stub(), writeMany: sinon.stub() };

    usecase = new CancelDelayed(
      jobRepository as never,
      { createMany: sinon.stub().resolves(), create: sinon.stub().resolves() } as never,
      { trace: sinon.stub().resolves() } as never,
      { setContext: sinon.stub(), error: sinon.stub() } as never,
      stepRunV2Writer as never
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  const execute = () =>
    usecase.execute({ environmentId: 'env_1', organizationId: 'org_1', transactionId: 'tx_1' } as never);

  it('writes canceled jobs, the promoted follower as delayed and its children as pending', async () => {
    await execute();

    expect(stepRunV2Writer.writeMany.firstCall.args).to.deep.equal([
      [mainDigestJob],
      { status: JobStatusEnum.CANCELED },
    ]);
    expect(stepRunV2Writer.write.calledOnceWithExactly(followerDigestJob, { status: JobStatusEnum.DELAYED })).to.be
      .true;
    expect(stepRunV2Writer.writeMany.secondCall.args).to.deep.equal([
      [followerChildJob],
      { status: JobStatusEnum.PENDING },
    ]);
  });

  it('does not write the follower when the MERGED -> DELAYED update matched nothing', async () => {
    jobRepository.update.onSecondCall().resolves({ matched: 0, modified: 0 });

    await execute();

    expect(stepRunV2Writer.write.called).to.be.false;
  });
});
