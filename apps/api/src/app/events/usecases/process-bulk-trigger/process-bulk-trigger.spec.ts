import { NotificationTemplateEntity } from '@novu/dal';
import { TriggerEventStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ProcessBulkTriggerCommand } from './process-bulk-trigger.command';
import { ProcessBulkTrigger } from './process-bulk-trigger.usecase';

describe('ProcessBulkTrigger', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should preserve the preloaded workflow when parsing an event', async () => {
    const workflow = {
      _id: 'workflow-id',
      active: true,
      triggers: [{ identifier: 'workflow-identifier' }],
    } as NotificationTemplateEntity;
    const parseEventRequest = {
      execute: sinon.stub().resolves({
        acknowledged: true,
        status: TriggerEventStatusEnum.PROCESSED,
        transactionId: 'transaction-id',
      }),
    };
    const notificationTemplateRepository = {
      find: sinon.stub().resolves([workflow]),
    };
    const workflowQueueService = {
      addBulk: sinon.stub(),
    };
    const processBulkTrigger = new ProcessBulkTrigger(
      parseEventRequest as any,
      notificationTemplateRepository as any,
      workflowQueueService as any
    );
    const command = ProcessBulkTriggerCommand.create({
      userId: 'user-id',
      environmentId: 'environment-id',
      organizationId: 'organization-id',
      requestId: 'request-id',
      events: [
        {
          name: 'workflow-identifier',
          payload: {},
          to: 'subscriber-id',
          transactionId: 'transaction-id',
        },
      ],
    });

    const result = await processBulkTrigger.execute(command);
    const parseCommand = parseEventRequest.execute.firstCall.args[0];

    expect(parseCommand.workflow).to.equal(workflow);
    expect(result).to.deep.equal([
      {
        acknowledged: true,
        status: TriggerEventStatusEnum.PROCESSED,
        transactionId: 'transaction-id',
      },
    ]);
    expect(workflowQueueService.addBulk.called).to.equal(false);
  });
});
