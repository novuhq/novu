import {
  getEffectiveJobPayload,
  StorageHelperService,
  StorageService,
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
  jobRepository: { claimNextChildAsQueued: sinon.SinonStub; updateOne: sinon.SinonStub };
  addJobUsecase: { execute: sinon.SinonStub };
  storageHelperService: StorageHelperService;
  workflowRunService: { updateDeliveryLifecycle: sinon.SinonStub };
  stepRunRepository: { create: sinon.SinonStub };
  createExecutionDetails: { execute: sinon.SinonStub };
  logger: { debug: sinon.SinonStub; warn: sinon.SinonStub };
};

const ATTACHMENT_STORAGE_PATH = 'environment-id/attachment.pdf';
const PDF_BYTES = Buffer.from('%PDF-1.7 pdf-bytes');

function buildUsecase(sandbox: sinon.SinonSandbox): RunJobTestDouble {
  const usecase = Object.create(RunJob.prototype) as RunJobTestDouble;
  usecase.jobRepository = { claimNextChildAsQueued: sandbox.stub(), updateOne: sandbox.stub().resolves() };
  usecase.addJobUsecase = { execute: sandbox.stub() };
  usecase.workflowRunService = { updateDeliveryLifecycle: sandbox.stub().resolves() };
  usecase.stepRunRepository = { create: sandbox.stub().resolves() };
  usecase.createExecutionDetails = { execute: sandbox.stub().resolves() };
  usecase.logger = { debug: sandbox.stub(), warn: sandbox.stub() };

  return usecase;
}

/** The attachment as the API persists it: uploaded to storage, `file` stripped. */
function buildStoredAttachment() {
  return { storagePath: ATTACHMENT_STORAGE_PATH, mime: 'application/pdf', name: 'attachment.pdf' };
}

function buildNotification(): PartialNotificationEntity {
  return {
    _id: 'notification-id',
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
  let deleteAttachments: sinon.SinonStub;
  let notification: PartialNotificationEntity;
  let triggerJob: JobEntity;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    usecase = buildUsecase(sandbox);
    deleteAttachments = sandbox.stub().resolves();
    usecase.storageHelperService = { deleteAttachments } as unknown as StorageHelperService;

    notification = buildNotification();
    // Payload-dedup: the executed job shares the notification's payload object,
    // onto which `getAttachments` hydrated the downloaded file.
    notification.payload.attachments[0].file = PDF_BYTES;
    triggerJob = buildJob({ payload: notification.payload });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('keeps the attachments in storage while a next job is still queued', async () => {
    const emailJob = buildJob({ _id: 'email-job-id', type: StepTypeEnum.EMAIL, payload: undefined });
    usecase.jobRepository.claimNextChildAsQueued.resolves(emailJob);
    usecase.addJobUsecase.execute.resolves({
      workflowStatus: WorkflowRunStatusEnum.PROCESSING,
      deliveryLifecycleStatus: null,
    });

    await usecase.tryQueueNextJobs(triggerJob, notification);

    sinon.assert.notCalled(deleteAttachments);
  });

  it('deletes the attachments once the chain has no next job', async () => {
    usecase.jobRepository.claimNextChildAsQueued.resolves(null);

    await usecase.tryQueueNextJobs(triggerJob, notification);

    sinon.assert.calledOnceWithExactly(deleteAttachments, notification.payload.attachments);
  });

  it('keeps the attachments when the finished job errored, so its retries still find them', async () => {
    usecase.jobRepository.claimNextChildAsQueued.resolves(null);

    await usecase.tryQueueNextJobs(triggerJob, notification, true);

    sinon.assert.notCalled(deleteAttachments);
  });

  it('leaves the completed state untouched when the attachment cleanup fails', async () => {
    usecase.jobRepository.claimNextChildAsQueued.resolves(null);
    deleteAttachments.rejects(new Error('storage is unavailable'));

    await usecase.tryQueueNextJobs(triggerJob, notification);

    // A second call would emit a duplicate completion trace for the same run.
    sinon.assert.calledOnce(usecase.workflowRunService.updateDeliveryLifecycle);
    sinon.assert.calledOnce(usecase.logger.warn);
  });

  it('does not write the resolved payload back onto a payload-dedup job', async () => {
    const dedupJob = buildJob({ payload: undefined });
    usecase.jobRepository.claimNextChildAsQueued.resolves(null);

    await usecase.tryQueueNextJobs(dedupJob, notification);

    sinon.assert.calledOnceWithExactly(deleteAttachments, notification.payload.attachments);
    expect(dedupJob.payload).to.equal(undefined);
  });

  it('deletes the executed job attachments when the chain ends on a skipped step', async () => {
    const skippedJob = buildJob({ _id: 'digest-job-id', type: StepTypeEnum.DIGEST, payload: undefined });
    usecase.jobRepository.claimNextChildAsQueued.onFirstCall().resolves(skippedJob).onSecondCall().resolves(null);
    usecase.addJobUsecase.execute.resolves({
      workflowStatus: null,
      deliveryLifecycleStatus: null,
      stepStatus: JobStatusEnum.SKIPPED,
    });

    await usecase.tryQueueNextJobs(triggerJob, notification);

    sinon.assert.calledOnceWithExactly(deleteAttachments, notification.payload.attachments);
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

describe('RunJob - attachment lifecycle across a trigger -> email chain', () => {
  it('leaves the file in storage for the email step and removes it when the chain ends', async () => {
    const sandbox = sinon.createSandbox();
    const storage = new InMemoryStorageService();
    await storage.uploadFile(ATTACHMENT_STORAGE_PATH, PDF_BYTES);

    const storageHelperService = new StorageHelperService(storage as unknown as StorageService);
    const usecase = buildUsecase(sandbox);
    usecase.storageHelperService = storageHelperService;

    const notification = buildNotification();
    const triggerJob = buildJob({ payload: undefined });
    const emailJob = buildJob({ _id: 'email-job-id', type: StepTypeEnum.EMAIL, payload: undefined });

    // Trigger step runs: resolves its payload from the notification and hydrates the file.
    triggerJob.payload = getEffectiveJobPayload(triggerJob, notification);
    await storageHelperService.getAttachments(triggerJob.payload.attachments);

    // ...then queues the email step.
    usecase.jobRepository.claimNextChildAsQueued.resolves(emailJob);
    usecase.addJobUsecase.execute.resolves({
      workflowStatus: WorkflowRunStatusEnum.PROCESSING,
      deliveryLifecycleStatus: null,
    });
    await usecase.tryQueueNextJobs(triggerJob, notification);

    expect(storage.has(ATTACHMENT_STORAGE_PATH)).to.equal(true);

    // Email step runs and still finds the file it is supposed to send.
    emailJob.payload = getEffectiveJobPayload(emailJob, notification);
    await storageHelperService.getAttachments(emailJob.payload.attachments);
    expect(emailJob.payload.attachments[0].file).to.deep.equal(PDF_BYTES);

    // Email step has no child, so the chain ends and the file is cleaned up.
    usecase.jobRepository.claimNextChildAsQueued.resolves(null);
    await usecase.tryQueueNextJobs(emailJob, notification);

    expect(storage.has(ATTACHMENT_STORAGE_PATH)).to.equal(false);

    sandbox.restore();
  });
});
