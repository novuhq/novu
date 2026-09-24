import {
  CacheService,
  getEffectiveJobPayload,
  PinoLogger,
  StorageHelperService,
  StorageService,
  TriggerAttachmentsService,
  WEBHOOK_FILTER_REQUEST_FAILED_DATA,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { JobEntity, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { PartialNotificationEntity } from '../add-job/add-job.command';
import { RunJob } from './run-job.usecase';

/**
 * Structural view of the collaborators `tryQueueNextJobs` touches, so the
 * cleanup ordering can be asserted without booting the full DI graph.
 */
type RunJobTestDouble = {
  tryQueueNextJobs: (
    job: JobEntity,
    notification?: PartialNotificationEntity | null,
    hasCurrentJobError?: boolean
  ) => Promise<void>;
  jobRepository: {
    claimNextChildAsQueued: sinon.SinonStub;
    updateOne: sinon.SinonStub;
    findOne: sinon.SinonStub;
    cancelPendingJobs: sinon.SinonStub;
  };
  addJobUsecase: { execute: sinon.SinonStub };
  setJobAsFailed: { execute: sinon.SinonStub };
  triggerAttachmentsService: TriggerAttachmentsService;
  workflowRunService: { updateDeliveryLifecycle: sinon.SinonStub };
  stepRunRepository: { create: sinon.SinonStub; createMany: sinon.SinonStub };
  createExecutionDetails: { execute: sinon.SinonStub };
  logger: { debug: sinon.SinonStub; warn: sinon.SinonStub; error: sinon.SinonStub };
};

const ATTACHMENT_STORAGE_PATH = 'environment-id/attachment.pdf';
const PDF_BYTES = Buffer.from('%PDF-1.7 pdf-bytes');

function buildUsecase(sandbox: sinon.SinonSandbox): RunJobTestDouble {
  const usecase = Object.create(RunJob.prototype) as RunJobTestDouble;
  usecase.jobRepository = {
    claimNextChildAsQueued: sandbox.stub(),
    updateOne: sandbox.stub().resolves(),
    findOne: sandbox.stub().resolves(null),
    cancelPendingJobs: sandbox.stub().resolves([]),
  };
  usecase.addJobUsecase = { execute: sandbox.stub() };
  usecase.setJobAsFailed = { execute: sandbox.stub().resolves() };
  usecase.workflowRunService = { updateDeliveryLifecycle: sandbox.stub().resolves() };
  usecase.stepRunRepository = { create: sandbox.stub().resolves(), createMany: sandbox.stub().resolves() };
  usecase.createExecutionDetails = { execute: sandbox.stub().resolves() };
  usecase.logger = { debug: sandbox.stub(), warn: sandbox.stub(), error: sandbox.stub() };

  return usecase;
}

/** The attachment as the API persists it: uploaded to storage, `file` stripped. */
function buildStoredAttachment() {
  return { storagePath: ATTACHMENT_STORAGE_PATH, mime: 'application/pdf', name: 'attachment.pdf' };
}

function buildNotification(id = 'notification-id'): PartialNotificationEntity {
  return {
    _id: id,
    payload: { attachments: [buildStoredAttachment()] },
  } as unknown as PartialNotificationEntity;
}

function buildJob(overrides: Partial<JobEntity> = {}): JobEntity {
  return {
    _id: 'job-id',
    _environmentId: 'environment-id',
    _organizationId: 'organization-id',
    _subscriberId: 'subscriber-id',
    _notificationId: 'notification-id',
    _templateId: 'template-id',
    _userId: 'user-id',
    subscriberId: 'subscriber-id',
    identifier: 'workflow-identifier',
    type: StepTypeEnum.TRIGGER,
    transactionId: 'transaction-id',
    step: { _id: 'step-id' },
    ...overrides,
  } as unknown as JobEntity;
}

describe('RunJob - attachment cleanup ordering', () => {
  let sandbox: sinon.SinonSandbox;
  let usecase: RunJobTestDouble;
  let release: sinon.SinonStub;
  let notification: PartialNotificationEntity;
  let triggerJob: JobEntity;

  function expectReleased() {
    sinon.assert.calledOnceWithExactly(release, {
      environmentId: 'environment-id',
      transactionId: 'transaction-id',
      attachments: notification.payload.attachments,
    });
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    usecase = buildUsecase(sandbox);
    release = sandbox.stub().resolves();
    usecase.triggerAttachmentsService = { release } as unknown as TriggerAttachmentsService;

    notification = buildNotification();
    // Payload-dedup: the executed job shares the notification's payload object,
    // onto which `getAttachments` hydrated the downloaded file.
    notification.payload.attachments[0].file = PDF_BYTES;
    triggerJob = buildJob({ payload: notification.payload });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('keeps the attachments while a next job is still queued', async () => {
    const emailJob = buildJob({ _id: 'email-job-id', type: StepTypeEnum.EMAIL, payload: undefined });
    usecase.jobRepository.claimNextChildAsQueued.resolves(emailJob);
    usecase.addJobUsecase.execute.resolves({
      workflowStatus: WorkflowRunStatusEnum.PROCESSING,
      deliveryLifecycleStatus: null,
    });

    await usecase.tryQueueNextJobs(triggerJob, notification);

    sinon.assert.notCalled(release);
  });

  it('releases the attachments once the chain has no next job', async () => {
    usecase.jobRepository.claimNextChildAsQueued.resolves(null);

    await usecase.tryQueueNextJobs(triggerJob, notification);

    expectReleased();
  });

  it('keeps the attachments when the finished job errored, so its retries still find them', async () => {
    usecase.jobRepository.claimNextChildAsQueued.resolves(null);

    await usecase.tryQueueNextJobs(triggerJob, notification, true);

    sinon.assert.notCalled(release);
  });

  it('does not write the resolved payload back onto a payload-dedup job', async () => {
    const dedupJob = buildJob({ payload: undefined });
    usecase.jobRepository.claimNextChildAsQueued.resolves(null);

    await usecase.tryQueueNextJobs(dedupJob, notification);

    expectReleased();
    expect(dedupJob.payload).to.equal(undefined);
  });

  it('releases the attachments when a failing child halts the workflow', async () => {
    const haltingJob = buildJob({
      _id: 'email-job-id',
      type: StepTypeEnum.EMAIL,
      payload: undefined,
      step: { _id: 'step-id', shouldStopOnFail: true },
    } as unknown as Partial<JobEntity>);
    usecase.jobRepository.claimNextChildAsQueued.resolves(haltingJob);
    usecase.addJobUsecase.execute.rejects(new Error('failed to add the job'));

    await usecase.tryQueueNextJobs(triggerJob, notification);

    sinon.assert.calledOnce(usecase.jobRepository.cancelPendingJobs);
    expectReleased();
  });

  it('keeps the attachments when a failing child will be retried', async () => {
    const retryingJob = buildJob({
      _id: 'email-job-id',
      type: StepTypeEnum.EMAIL,
      payload: undefined,
      step: { _id: 'step-id', shouldStopOnFail: true },
    } as unknown as Partial<JobEntity>);
    usecase.jobRepository.claimNextChildAsQueued.resolves(retryingJob);
    usecase.addJobUsecase.execute.rejects(new Error(WEBHOOK_FILTER_REQUEST_FAILED_DATA));

    await usecase.tryQueueNextJobs(triggerJob, notification);

    sinon.assert.notCalled(usecase.jobRepository.cancelPendingJobs);
    sinon.assert.notCalled(release);
  });

  it('releases the executed job attachments when the chain ends on a skipped step', async () => {
    const skippedJob = buildJob({ _id: 'digest-job-id', type: StepTypeEnum.DIGEST, payload: undefined });
    usecase.jobRepository.claimNextChildAsQueued.onFirstCall().resolves(skippedJob).onSecondCall().resolves(null);
    usecase.addJobUsecase.execute.resolves({
      workflowStatus: null,
      deliveryLifecycleStatus: null,
      stepStatus: JobStatusEnum.SKIPPED,
    });

    await usecase.tryQueueNextJobs(triggerJob, notification);

    expectReleased();
  });
});

/** In-memory stand-in for S3, so the ordering can be replayed without object storage. */
class InMemoryStorageService {
  private readonly files = new Map<string, Buffer>();

  async uploadFile(key: string, file: Buffer): Promise<void> {
    this.files.set(key, file);
  }

  async getFile(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) {
      // StorageHelperService recognises a missing object by error name.
      const error = new Error(`File ${key} does not exist`);
      error.name = 'NonExistingFileError';
      throw error;
    }

    return file;
  }

  async deleteFile(key: string): Promise<void> {
    this.files.delete(key);
  }

  has(key: string): boolean {
    return this.files.has(key);
  }
}

/** In-memory stand-in for the Redis reference counter scripts. */
class InMemoryCounterCacheService {
  private readonly counters = new Map<string, number>();

  async eval(script: string, keys: string[], args: (string | number)[]): Promise<number | null> {
    const [key] = keys;
    const current = this.counters.get(key);
    const isRelease = script.includes('decrby');
    const requiresExistingCounter = isRelease || script.includes("'exists'");

    if (requiresExistingCounter && current === undefined) {
      return null;
    }

    if (!isRelease) {
      const count = (current ?? 0) + Number(args[0]);
      this.counters.set(key, count);

      return count;
    }

    const count = (current ?? 0) - Number(args[0]);
    if (count <= 0) {
      this.counters.delete(key);
    } else {
      this.counters.set(key, count);
    }

    return count;
  }
}

describe('RunJob - attachment lifecycle across subscriber chains', () => {
  let sandbox: sinon.SinonSandbox;
  let storage: InMemoryStorageService;
  let storageHelperService: StorageHelperService;
  let triggerAttachmentsService: TriggerAttachmentsService;
  let usecase: RunJobTestDouble;

  const triggerRef = {
    environmentId: 'environment-id',
    transactionId: 'transaction-id',
    attachments: [buildStoredAttachment()],
  };

  /** Replays one subscriber's trigger -> email chain and returns what its email step read. */
  async function runSubscriberChain(subscriberId: string): Promise<Buffer | null | undefined> {
    const notification = buildNotification(`notification-${subscriberId}`);
    const jobDefaults = { _subscriberId: subscriberId, _notificationId: notification._id, payload: undefined };
    const triggerJob = buildJob({ ...jobDefaults, _id: `trigger-${subscriberId}` });
    const emailJob = buildJob({ ...jobDefaults, _id: `email-${subscriberId}`, type: StepTypeEnum.EMAIL });

    triggerJob.payload = getEffectiveJobPayload(triggerJob, notification);
    await storageHelperService.getAttachments(triggerJob.payload.attachments);
    usecase.jobRepository.claimNextChildAsQueued.resolves(emailJob);
    usecase.addJobUsecase.execute.resolves({
      workflowStatus: WorkflowRunStatusEnum.PROCESSING,
      deliveryLifecycleStatus: null,
    });
    await usecase.tryQueueNextJobs(triggerJob, notification);

    emailJob.payload = getEffectiveJobPayload(emailJob, notification);
    await storageHelperService.getAttachments(emailJob.payload.attachments);
    const sentFile = emailJob.payload.attachments[0].file;

    usecase.jobRepository.claimNextChildAsQueued.resolves(null);
    await usecase.tryQueueNextJobs(emailJob, notification);

    return sentFile;
  }

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    storage = new InMemoryStorageService();
    await storage.uploadFile(ATTACHMENT_STORAGE_PATH, PDF_BYTES);

    storageHelperService = new StorageHelperService(storage as unknown as StorageService);
    triggerAttachmentsService = new TriggerAttachmentsService(
      new InMemoryCounterCacheService() as unknown as CacheService,
      storage as unknown as StorageService,
      { setContext: sandbox.stub(), warn: sandbox.stub() } as unknown as PinoLogger
    );
    usecase = buildUsecase(sandbox);
    usecase.triggerAttachmentsService = triggerAttachmentsService;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('keeps the file for the email step of a single subscriber and removes it when the chain ends', async () => {
    await triggerAttachmentsService.acquireFanOutHold(triggerRef);
    await triggerAttachmentsService.retain(triggerRef, 1);
    await triggerAttachmentsService.releaseFanOutHold(triggerRef);

    expect(await runSubscriberChain('subscriber-a')).to.deep.equal(PDF_BYTES);
    expect(storage.has(ATTACHMENT_STORAGE_PATH)).to.equal(false);
  });

  it('delivers the shared file to every subscriber of a topic and removes it after the last chain', async () => {
    await triggerAttachmentsService.acquireFanOutHold(triggerRef);
    await triggerAttachmentsService.retain(triggerRef, 2);
    await triggerAttachmentsService.releaseFanOutHold(triggerRef);

    expect(await runSubscriberChain('subscriber-a')).to.deep.equal(PDF_BYTES);
    expect(storage.has(ATTACHMENT_STORAGE_PATH)).to.equal(true);

    expect(await runSubscriberChain('subscriber-b')).to.deep.equal(PDF_BYTES);
    expect(storage.has(ATTACHMENT_STORAGE_PATH)).to.equal(false);
  });

  it('keeps the file for subscribers enqueued after an earlier chain already finished', async () => {
    await triggerAttachmentsService.acquireFanOutHold(triggerRef);
    await triggerAttachmentsService.retain(triggerRef, 1);

    expect(await runSubscriberChain('subscriber-a')).to.deep.equal(PDF_BYTES);

    await triggerAttachmentsService.retain(triggerRef, 1);
    await triggerAttachmentsService.releaseFanOutHold(triggerRef);

    expect(await runSubscriberChain('subscriber-b')).to.deep.equal(PDF_BYTES);
    expect(storage.has(ATTACHMENT_STORAGE_PATH)).to.equal(false);
  });
});
