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
  const promotedFollowerDigestJob = { ...followerDigestJob, status: JobStatusEnum.DELAYED };
  const followerChildJob = { _id: 'follower_child', _environmentId: 'env_1', status: JobStatusEnum.PENDING };

  let jobRepository: {
    find: sinon.SinonStub;
    findOne: sinon.SinonStub;
    findOneAndUpdate: sinon.SinonStub;
    update: sinon.SinonStub;
    updateAllChildJobStatus: sinon.SinonStub;
  };
  let stepRunV2Writer: { write: sinon.SinonStub; writeMany: sinon.SinonStub; writeByIds: sinon.SinonStub };
  let usecase: CancelDelayed;

  beforeEach(() => {
    jobRepository = {
      find: sinon.stub(),
      findOne: sinon.stub().resolves(followerDigestJob),
      findOneAndUpdate: sinon.stub().resolves(promotedFollowerDigestJob),
      update: sinon.stub().resolves({ matched: 1, modified: 1 }),
      updateAllChildJobStatus: sinon.stub().resolves([followerChildJob]),
    };
    jobRepository.find.onFirstCall().resolves([mainDigestJob]);
    jobRepository.find.resolves([]);
    stepRunV2Writer = { write: sinon.stub(), writeMany: sinon.stub(), writeByIds: sinon.stub() };

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

  it('re-reads the bulk-canceled jobs and writes the promoted follower and its children as updated', async () => {
    await execute();

    expect(
      stepRunV2Writer.writeByIds.calledOnceWithExactly({
        environmentId: 'env_1',
        organizationId: 'org_1',
        jobIds: ['main_digest'],
      })
    ).to.be.true;
    expect(stepRunV2Writer.write.calledOnceWithExactly(promotedFollowerDigestJob)).to.be.true;
    expect(stepRunV2Writer.writeMany.calledOnceWithExactly([followerChildJob])).to.be.true;
  });

  it('passes a null follower through when the MERGED -> DELAYED update matched nothing', async () => {
    jobRepository.findOneAndUpdate.resolves(null);

    await execute();

    expect(stepRunV2Writer.write.calledOnceWithExactly(null)).to.be.true;
  });
});
