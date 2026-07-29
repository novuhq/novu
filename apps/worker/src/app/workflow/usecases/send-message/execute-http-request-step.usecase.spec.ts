import { expect } from 'chai';
import sinon from 'sinon';
import { ExecuteHttpRequestStep } from './execute-http-request-step.usecase';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageStatus } from './send-message-type.usecase';

describe('ExecuteHttpRequestStep - steps namespace', () => {
  function buildDigestStepsMap() {
    return {
      'digest-step': {
        events: [
          {
            id: 'event_1',
            time: '2026-07-23T09:00:00.000Z',
            payload: { name: 'Ada', orderId: '123' },
          },
          {
            id: 'event_2',
            time: '2026-07-23T09:01:00.000Z',
            payload: { name: 'Grace', orderId: '456' },
          },
        ],
        eventCount: 2,
        countSummary: '2 notifications',
        sentenceSummary: 'Ada, Grace',
      },
    };
  }

  function buildUsecase(controls: Record<string, unknown>) {
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const jobRepository = { updateOne: sinon.stub().resolves(undefined) };
    const httpClientService = {
      request: sinon.stub().resolves({
        statusCode: 200,
        body: '{"ok":true}',
        headers: {},
      }),
    };
    const controlValuesRepository = {
      findOne: sinon.stub().resolves({ controls }),
    };
    const notificationTemplateRepository = {
      findById: sinon.stub().resolves({
        _id: 'tpl_1',
        origin: 'novu-cloud',
      }),
    };
    const getDecryptedSecretKey = {
      execute: sinon.stub().resolves('secret-key'),
    };
    const executeBridgeJob = {
      buildStepsMap: sinon.stub().resolves(buildDigestStepsMap()),
    };
    const logger = {
      error: sinon.stub(),
    };

    const createStepConditionsPassedDetail = {
      execute: sinon.stub().resolves(undefined),
      isEnabled: sinon.stub().resolves(false),
    };

    const usecase = new ExecuteHttpRequestStep(
      jobRepository as never,
      httpClientService as never,
      controlValuesRepository as never,
      notificationTemplateRepository as never,
      logger as never,
      getDecryptedSecretKey as never,
      executeBridgeJob as never,
      createStepConditionsPassedDetail as never,
      {} as never,
      createExecutionDetails as never
    );

    return {
      usecase,
      httpClientService,
      executeBridgeJob,
    };
  }

  function buildCommand() {
    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: {},
      overrides: {},
      step: {
        _id: 'step_tpl_1',
        stepId: 'http-step',
        template: { type: 'http_request' },
      } as never,
      transactionId: 'tx_1',
      notificationId: 'notification_1',
      subscriberId: 'subscriber_1',
      _subscriberId: 'subscriber_1',
      jobId: 'http_job_1',
      job: {
        _id: 'http_job_1',
        _parentId: 'digest_job_1',
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        _notificationId: 'notification_1',
        _templateId: 'tpl_1',
        subscriberId: 'subscriber_1',
        _subscriberId: 'subscriber_1',
        transactionId: 'tx_1',
        identifier: 'wf-identifier',
        type: 'http_request',
        step: { stepId: 'http-step', template: { type: 'http_request' } },
      } as never,
      tags: [],
      contextKeys: [],
      _templateId: 'tpl_1',
      workflow: {
        _id: 'tpl_1',
        origin: 'novu-cloud',
      } as never,
      compileContext: {
        subscriber: { subscriberId: 'subscriber_1' },
        payload: {},
        step: {
          digest: false,
          events: undefined,
          total_count: undefined,
        },
        env: { name: 'Development', type: 'dev' },
      } as never,
      bridgeData: null,
      environment: { _id: 'env_1' } as never,
    } as never);
  }

  afterEach(() => {
    sinon.restore();
  });

  it('compiles steps.digest-step.eventCount into the HTTP request body', async () => {
    const { usecase, httpClientService, executeBridgeJob } = buildUsecase({
      url: 'https://example.com/webhook',
      method: 'POST',
      body: '{"eventCount":{{steps.digest-step.eventCount}}}',
    });

    const result = await usecase.execute(buildCommand());

    expect(executeBridgeJob.buildStepsMap.calledOnce).to.equal(true);
    expect(result.status).to.equal(SendMessageStatus.SUCCESS);

    const requestArgs = httpClientService.request.firstCall.args[0];
    expect(requestArgs.body).to.deep.equal({ eventCount: 2 });
  });

  it('compiles steps.digest-step.events into the HTTP request body', async () => {
    const { usecase, httpClientService } = buildUsecase({
      url: 'https://example.com/webhook',
      method: 'POST',
      body: '{"events":{{steps.digest-step.events}}}',
    });

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);

    const requestArgs = httpClientService.request.firstCall.args[0];
    expect(requestArgs.body).to.deep.equal({
      events: buildDigestStepsMap()['digest-step'].events,
    });
  });

  it('compiles digest summary helpers into headers and URL templates', async () => {
    const { usecase, httpClientService } = buildUsecase({
      url: 'https://example.com/{{steps.digest-step.countSummary}}',
      method: 'POST',
      headers: [{ key: 'X-Digest-Summary', value: '{{steps.digest-step.sentenceSummary}}' }],
      body: '{"summary":"{{steps.digest-step.countSummary}}"}',
    });

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);

    const requestArgs = httpClientService.request.firstCall.args[0];
    expect(requestArgs.url).to.equal('https://example.com/2 notifications');
    expect(requestArgs.headers['X-Digest-Summary']).to.equal('Ada, Grace');
    expect(requestArgs.body).to.deep.equal({ summary: '2 notifications' });
  });
});
