import { SECRET_MASK } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ExecuteHttpRequestStep } from './execute-http-request-step.usecase';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResultFailed, SendMessageStatus } from './send-message-type.usecase';

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

  function buildUsecase(controls: Record<string, unknown>, wasConditionEvaluationTraced = false) {
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

    const createStepConditionEvaluationDetail = {
      execute: sinon.stub().resolves(wasConditionEvaluationTraced),
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
      createStepConditionEvaluationDetail as never,
      {} as never,
      createExecutionDetails as never
    );

    return {
      usecase,
      httpClientService,
      executeBridgeJob,
      createExecutionDetails,
      createStepConditionEvaluationDetail,
    };
  }

  function findFailureDetail(createExecutionDetails: { execute: sinon.SinonStub }) {
    return createExecutionDetails.execute
      .getCalls()
      .map((call) => call.args[0] as { detail: string; raw?: string })
      .find((args) => args.raw?.includes('Invalid raw JSON body'));
  }

  function buildCommand(env: Record<string, string> = { name: 'Development', type: 'dev' }) {
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
        env,
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

  it('uses the condition evaluation detail instead of a generic bridge skip detail when tracing succeeds', async () => {
    const { usecase, createExecutionDetails, createStepConditionEvaluationDetail } = buildUsecase(
      {
        url: 'https://example.com/webhook',
        method: 'POST',
        skip: { '==': [{ var: 'payload.tier' }, 'pro'] },
      },
      true
    );

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SKIPPED);
    expect(createStepConditionEvaluationDetail.execute.calledOnce).to.equal(true);
    expect(createStepConditionEvaluationDetail.execute.firstCall.args[0].passed).to.equal(false);
    expect(createExecutionDetails.execute.called).to.equal(false);
  });

  it('keeps the generic bridge skip detail when condition evaluation tracing is disabled', async () => {
    const { usecase, createExecutionDetails } = buildUsecase({
      url: 'https://example.com/webhook',
      method: 'POST',
      skip: { '==': [{ var: 'payload.tier' }, 'pro'] },
    });

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SKIPPED);
    expect(createExecutionDetails.execute.calledOnce).to.equal(true);
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

  it('records an execution detail when the compiled body cannot be repaired into valid JSON', async () => {
    const { usecase, httpClientService, createExecutionDetails } = buildUsecase({
      url: 'https://example.com/webhook',
      method: 'POST',
      body: '{"order":{"lines":[{"item":{"sku" }}]}}',
    });

    const result = (await usecase.execute(buildCommand())) as SendMessageResultFailed;

    expect(result.status).to.equal(SendMessageStatus.FAILED);
    expect(result.shouldHalt).to.equal(true);
    expect(httpClientService.request.called).to.equal(false);

    const failureDetail = findFailureDetail(createExecutionDetails);
    expect(failureDetail, 'expected a failed execution detail for the unrepairable body').to.not.equal(undefined);

    const raw = JSON.parse(failureDetail?.raw ?? '{}');
    expect(raw.error).to.contain('Colon expected');
    expect(raw.bodyExcerpt).to.contain('"sku"');
    expect(raw.hint).to.be.a('string');
  });

  it('does not halt the chain for an unrepairable body when continueOnFailure is enabled', async () => {
    const { usecase, createExecutionDetails } = buildUsecase({
      url: 'https://example.com/webhook',
      method: 'POST',
      continueOnFailure: true,
      body: '{"order":{"lines":[{"item":{"sku" }}]}}',
    });

    const result = (await usecase.execute(buildCommand())) as SendMessageResultFailed;

    expect(result.status).to.equal(SendMessageStatus.FAILED);
    expect(result.shouldHalt).to.equal(false);
    expect(findFailureDetail(createExecutionDetails)).to.not.equal(undefined);
  });

  it('masks rendered environment variable secrets out of the persisted excerpt', async () => {
    const secret = 'sk_live_51NQpZmKq7xTvR3wY';
    const { usecase, createExecutionDetails } = buildUsecase({
      url: 'https://example.com/webhook',
      method: 'POST',
      body: '{"token":"{{env.PARTNER_API_KEY}}","tier":"{{env.type}}","order":{"sku" }}',
    });

    const result = await usecase.execute(buildCommand({ name: 'Production', type: 'prod', PARTNER_API_KEY: secret }));

    expect(result.status).to.equal(SendMessageStatus.FAILED);

    const raw = JSON.parse(findFailureDetail(createExecutionDetails)?.raw ?? '{}');
    expect(raw.bodyExcerpt, 'the excerpt must not carry the decrypted env secret').to.not.contain(secret);
    expect(raw.bodyExcerpt).to.contain(SECRET_MASK);
    // System env values are not secrets, and masking them would gut the excerpt.
    expect(raw.bodyExcerpt).to.contain('"tier":"prod"');
    expect(raw.bodyExcerpt).to.contain('"order":{"sku" }');
  });
});
