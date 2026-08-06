import { JobEntity, NotificationEntity } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { RunJob } from '../usecases/run-job';

/**
 * Attachments are uploaded once per trigger and downloaded again by every job that
 * needs them, so they may only be released after the last job of the chain. Under
 * payload-dedup a job's payload is the parent notification's payload object, which the
 * already-executed job hydrates with the downloaded file — deleting on that hydrated
 * payload used to wipe the file before the next step could send it.
 */
describe('RunJob - stored attachment cleanup', () => {
  const buildNotification = () =>
    ({
      _id: 'notification-id',
      payload: {
        attachments: [
          {
            name: 'invoice.pdf',
            mime: 'application/pdf',
            storagePath: 'org/env/random/invoice.pdf',
            file: Buffer.from('%PDF-1.7'),
          },
        ],
      },
    }) as unknown as NotificationEntity;

  const buildJob = (payload?: Record<string, unknown>) =>
    ({
      _id: 'job-id',
      _environmentId: 'env-id',
      _organizationId: 'org-id',
      _subscriberId: 'subscriber-id',
      _notificationId: 'notification-id',
      _userId: 'user-id',
      type: 'trigger',
      payload,
    }) as unknown as JobEntity;

  const buildRunJob = (overrides: Record<string, unknown>) => {
    const runJob = Object.create(RunJob.prototype);

    Object.assign(runJob, {
      workflowRunService: { updateDeliveryLifecycle: sinon.stub().resolves() },
      addJobUsecase: { execute: sinon.stub().resolves({ stepStatus: 'queued' }) },
      stepRunRepository: { create: sinon.stub().resolves(), createMany: sinon.stub().resolves() },
      createExecutionDetails: { execute: sinon.stub().resolves() },
      logger: { error: sinon.stub(), info: sinon.stub() },
      ...overrides,
    });

    return runJob;
  };

  it('keeps the stored attachments while the next job is queued', async () => {
    const notification = buildNotification();
    const deleteAttachments = sinon.stub().resolves();
    const runJob = buildRunJob({
      jobRepository: {
        claimNextChildAsQueued: sinon.stub().resolves(buildJob()),
      },
      storageHelperService: { deleteAttachments },
    });

    await runJob.tryQueueNextJobs(buildJob(), notification, false);

    expect(deleteAttachments.called).to.equal(false);
  });

  it('releases the stored attachments once no job is left in the chain', async () => {
    const notification = buildNotification();
    const deleteAttachments = sinon.stub().resolves();
    const runJob = buildRunJob({
      jobRepository: {
        claimNextChildAsQueued: sinon.stub().resolves(null),
      },
      storageHelperService: { deleteAttachments },
    });

    await runJob.tryQueueNextJobs(buildJob(), notification, false);

    expect(deleteAttachments.calledOnce).to.equal(true);
    expect(deleteAttachments.firstCall.args[0]).to.equal(notification.payload.attachments);
  });
});
