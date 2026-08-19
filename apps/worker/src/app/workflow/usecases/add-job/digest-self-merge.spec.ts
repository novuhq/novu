import { CreateExecutionDetails, StepRunRepository } from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum, NotificationRepository } from '@novu/dal';
import {
  DigestCreationResultEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  IDigestBaseMetadata,
  StepTypeEnum,
} from '@novu/shared';
import { expect } from 'chai';
import { Types } from 'mongoose';
import sinon from 'sinon';
import { MergeOrCreateDigestCommand } from './merge-or-create-digest.command';
import { MergeOrCreateDigest } from './merge-or-create-digest.usecase';

const DIGEST_VALUE = 'digest-value-regression';

function validObjectId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Builds a digest job in the exact state a re-executed digest master starts from:
 * already `DELAYED` (i.e. `markJobAsDigestMaster` has been applied) and carrying a
 * matching `digest.digestValue`.
 */
function buildDelayedDigestMaster(): JobEntity {
  return {
    _id: validObjectId(),
    _environmentId: validObjectId(),
    _organizationId: validObjectId(),
    _subscriberId: validObjectId(),
    _notificationId: validObjectId(),
    _templateId: validObjectId(),
    status: JobStatusEnum.DELAYED,
    type: StepTypeEnum.DIGEST,
    subscriberId: 'external-subscriber-id',
    transactionId: 'transaction-id',
    identifier: 'workflow-identifier',
    providerId: 'digest-provider',
    digest: {
      type: DigestTypeEnum.REGULAR,
      amount: 1,
      unit: DigestUnitEnum.MINUTES,
      digestValue: DIGEST_VALUE,
    },
  } as unknown as JobEntity;
}

/**
 * Minimal in-memory stand-in for the Mongoose Job model. It mirrors the semantics
 * the repository query relies on: key equality, `$ne` on `_id`, and dotted-path
 * (`digest.digestValue`) lookups. The only way behaviour can change is the shape of
 * the `filter` handed in by the repository method under test.
 */
function createModelLookup(sandbox: sinon.SinonSandbox, storedJobs: Array<{ _id: string }>) {
  return sandbox.stub().callsFake(async (filter: Record<string, unknown>) => {
    const hit = storedJobs.find((doc) =>
      Object.entries(filter).every(([key, rule]) => {
        const docValue = key.split('.').reduce((obj: any, part: string) => obj?.[part], doc);
        if (rule && typeof rule === 'object' && '$ne' in rule) {
          return String(docValue) !== String(rule.$ne);
        }

        return String(docValue) === String(rule);
      })
    );

    return hit ?? null;
  });
}

function createRepository(
  sandbox: sinon.SinonSandbox,
  storedJob: JobEntity
): JobRepository & { _model: { findOne: sinon.SinonStub; updateOne: sinon.SinonStub } } {
  const repository = Object.create(JobRepository.prototype) as JobRepository & { _model: any };

  repository._model = {
    findOne: createModelLookup(sandbox, [storedJob]),
    updateOne: sandbox.stub().resolves(),
  };
  sinon.stub(repository, 'update').resolves();
  sinon.stub(repository, 'updateAllChildJobStatus').resolves([] as JobEntity[]);

  return repository;
}

describe('Digest self-merge regression', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('excludes the job being processed from the existing delayed digest lookup', async () => {
    const job = buildDelayedDigestMaster();
    const repository = createRepository(sandbox, job);

    const existing = await repository.getExistingDelayedJobWithTheSameDigestValue(
      job,
      job.digest as IDigestBaseMetadata
    );

    expect(existing).to.equal(null);
  });

  it('treats a re-executed digest master as the digest master instead of merging it into itself', async () => {
    const job = buildDelayedDigestMaster();
    const repository = createRepository(sandbox, job);

    const usecase = new MergeOrCreateDigest(
      repository,
      { execute: sandbox.stub().resolves() } as unknown as CreateExecutionDetails,
      { update: sandbox.stub().resolves() } as unknown as NotificationRepository,
      { createMany: sandbox.stub().resolves() } as unknown as StepRunRepository
    );

    const result = await usecase.execute(MergeOrCreateDigestCommand.create({ job }));

    expect(result).to.equal(DigestCreationResultEnum.CREATED);
  });
});
