import { ENDPOINT_TYPES, WorkflowAgentDispatchStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HttpClientService } from '../../services/http-client';
import { NotifyWorkflowAgentDispatchClientCommand } from './notify-workflow-agent-dispatch.command';
import { NotifyWorkflowAgentDispatchClient } from './notify-workflow-agent-dispatch.usecase';

describe('NotifyWorkflowAgentDispatchClient', () => {
  let httpClientService: { request: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; error: sinon.SinonStub };
  let previousApiRootUrl: string | undefined;

  beforeEach(() => {
    previousApiRootUrl = process.env.API_ROOT_URL;
    process.env.API_ROOT_URL = 'http://api.novu.test';
    httpClientService = { request: sinon.stub() };
    logger = { setContext: sinon.stub(), error: sinon.stub() };
  });

  afterEach(() => {
    if (previousApiRootUrl === undefined) {
      delete process.env.API_ROOT_URL;
    } else {
      process.env.API_ROOT_URL = previousApiRootUrl;
    }
    sinon.restore();
  });

  function buildClient() {
    return new NotifyWorkflowAgentDispatchClient(httpClientService as unknown as HttpClientService, logger as any);
  }

  function buildCommand() {
    return NotifyWorkflowAgentDispatchClientCommand.create({
      agentId: 'my-agent',
      apiKey: 'api-key-value',
      integrationIdentifier: 'slack-main',
      destination: { type: ENDPOINT_TYPES.SLACK_USER, userId: 'U123' },
      content: 'hello',
      idempotencyKey: 'msg:endpoint',
      origin: {
        notificationId: 'n1',
        jobId: 'j1',
        messageId: 'm1',
        transactionId: 't1',
        workflowIdentifier: 'wf',
        subscriberId: 'sub-1',
      },
    });
  }

  it('POSTs to the workflow-dispatch endpoint with ApiKey auth', async () => {
    httpClientService.request.resolves({
      statusCode: 200,
      body: {
        data: {
          dispatchId: 'd1',
          platformMessageId: 'ts-1',
          platformThreadId: 'slack:D123:ts-1',
          status: WorkflowAgentDispatchStatusEnum.SENT,
        },
      },
      headers: {},
    });

    const result = await buildClient().execute(buildCommand());

    expect(result.dispatchId).to.equal('d1');
    expect(httpClientService.request.calledOnce).to.equal(true);

    const options = httpClientService.request.firstCall.args[0];
    expect(options.url).to.equal('http://api.novu.test/v1/agents/my-agent/workflow-dispatch');
    expect(options.method).to.equal('POST');
    expect(options.headers.authorization).to.equal('ApiKey api-key-value');
    expect(options.body.idempotencyKey).to.equal('msg:endpoint');
    expect(options.body.destination).to.deep.equal({ type: ENDPOINT_TYPES.SLACK_USER, userId: 'U123' });
  });

  it('throws when API_ROOT_URL is missing', async () => {
    delete process.env.API_ROOT_URL;

    try {
      await buildClient().execute(buildCommand());
      expect.fail('expected BadRequestException');
    } catch (error) {
      expect((error as Error).message).to.include('API_ROOT_URL');
    }
  });
});
