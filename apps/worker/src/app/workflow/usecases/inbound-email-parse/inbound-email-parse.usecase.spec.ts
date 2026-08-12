import { BadRequestException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { InboundEmailParse } from './inbound-email-parse.usecase';
import {
  INBOUND_DELIVERY_FAILURE_CUSTOMER_MESSAGE,
  InboundParseDroppedError,
  InboundParseProcessingError,
} from './inbound-parse-outcome';
import { LogInboundEmailRequest } from './log-inbound-email-request.usecase';
import { DomainRouteStrategy } from './strategies/domain-route.strategy';
import { ReplyToStrategy } from './strategies/reply-to.strategy';

function buildCommand(): InboundEmailParseCommand {
  return {
    to: [{ address: 'agent5@inbound.novu-staging.co', name: '' }],
    from: [{ address: 'test@localhost', name: '' }],
    subject: 'Hello',
    html: '<p>Hi</p>',
    text: 'Hi',
    headers: {},
    messageId: 'msg-001',
    requestLogId: 'req_abc',
  } as unknown as InboundEmailParseCommand;
}

describe('InboundEmailParse terminal-trace policy', () => {
  let sandbox: sinon.SinonSandbox;
  let replyToStrategy: sinon.SinonStubbedInstance<ReplyToStrategy>;
  let domainRouteStrategy: sinon.SinonStubbedInstance<DomainRouteStrategy>;
  let logInboundEmailRequest: sinon.SinonStubbedInstance<LogInboundEmailRequest>;
  let usecase: InboundEmailParse;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    replyToStrategy = sandbox.createStubInstance(ReplyToStrategy);
    domainRouteStrategy = sandbox.createStubInstance(DomainRouteStrategy);
    logInboundEmailRequest = sandbox.createStubInstance(LogInboundEmailRequest);
    logInboundEmailRequest.execute.resolves();
    logInboundEmailRequest.logUnresolvedFailure.resolves();

    usecase = new InboundEmailParse(
      replyToStrategy as unknown as ReplyToStrategy,
      domainRouteStrategy as unknown as DomainRouteStrategy,
      logInboundEmailRequest as unknown as LogInboundEmailRequest,
      sandbox.createStubInstance(PinoLogger) as unknown as PinoLogger
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('routes an email using the CC recipient from the SMTP envelope', async () => {
    const command = buildCommand();
    command.to = [{ address: 'customer@example.com', name: '' }];
    command.cc = [{ address: 'support@verified-domain.com', name: '' }];
    command.envelopeTo = [{ address: 'support@verified-domain.com', args: false }];
    domainRouteStrategy.execute.resolves({
      organizationId: 'org_1',
      environmentId: 'env_1',
      transactionId: 'txn_1',
      strategy: 'domain-route',
      status: 200,
    });

    await usecase.execute(command);

    sinon.assert.calledOnceWithExactly(domainRouteStrategy.execute, command, 'support@verified-domain.com');
    sinon.assert.calledOnce(logInboundEmailRequest.execute);
  });

  it('routes an email using a BCC recipient that is only present in the SMTP envelope', async () => {
    const command = buildCommand();
    command.to = [{ address: 'customer@example.com', name: '' }];
    command.cc = [];
    command.envelopeTo = [{ address: 'agent@verified-domain.com', args: false }];
    domainRouteStrategy.execute.resolves({
      organizationId: 'org_1',
      environmentId: 'env_1',
      transactionId: 'txn_1',
      strategy: 'agent',
      status: 200,
    });

    await usecase.execute(command);

    sinon.assert.calledOnceWithExactly(domainRouteStrategy.execute, command, 'agent@verified-domain.com');
    sinon.assert.calledOnce(logInboundEmailRequest.execute);
  });

  it('checks subsequent envelope recipients when an earlier recipient has no Novu domain', async () => {
    const command = buildCommand();
    command.to = [{ address: 'customer@example.com', name: '' }];
    command.envelopeTo = [
      { address: 'customer@example.com', args: false },
      { address: 'support@verified-domain.com', args: false },
    ];
    domainRouteStrategy.execute.onFirstCall().rejects(new BadRequestException('No domain found'));
    domainRouteStrategy.execute.onSecondCall().resolves({
      organizationId: 'org_1',
      environmentId: 'env_1',
      transactionId: 'txn_1',
      strategy: 'domain-route',
      status: 200,
    });

    await usecase.execute(command);

    sinon.assert.calledTwice(domainRouteStrategy.execute);
    expect(domainRouteStrategy.execute.getCall(1).args[1]).to.equal('support@verified-domain.com');
    sinon.assert.calledOnce(logInboundEmailRequest.execute);
  });

  it('checks subsequent recipients when an earlier Novu domain has no matching route', async () => {
    const command = buildCommand();
    command.to = [{ address: 'customer@example.com', name: '' }];
    command.envelopeTo = [
      { address: 'unmatched@verified-domain.com', args: false },
      { address: 'support@verified-domain.com', args: false },
    ];
    domainRouteStrategy.execute.onFirstCall().resolves({
      organizationId: 'org_1',
      environmentId: 'env_1',
      transactionId: 'txn_1',
      strategy: 'domain-route',
      status: 422,
      message: 'No matching inbound route',
    });
    domainRouteStrategy.execute.onSecondCall().resolves({
      organizationId: 'org_1',
      environmentId: 'env_1',
      transactionId: 'txn_1',
      strategy: 'domain-route',
      status: 200,
    });

    await usecase.execute(command);

    sinon.assert.calledTwice(domainRouteStrategy.execute);
    expect(domainRouteStrategy.execute.getCall(1).args[1]).to.equal('support@verified-domain.com');
    sinon.assert.calledOnce(logInboundEmailRequest.execute);
    expect(logInboundEmailRequest.execute.getCall(0).args[0].outcome.status).to.equal(200);
  });

  it('prefers the message header for reply-to routing and retains the envelope as fallback', async () => {
    const command = buildCommand();
    command.to = [{ address: 'parse+header-txn-nv-e=env@mail.domain.com', name: '' }];
    command.envelopeTo = [{ address: 'parse+envelope-txn-nv-e=env@local-demo.com', args: false }];
    replyToStrategy.execute.resolves({
      organizationId: 'org_1',
      environmentId: 'env_1',
      transactionId: 'header-txn',
      strategy: 'reply-to',
      status: 200,
    });

    await usecase.execute(command);

    sinon.assert.calledOnceWithExactly(replyToStrategy.execute, command, 'parse+header-txn-nv-e=env@mail.domain.com');
    sinon.assert.notCalled(domainRouteStrategy.execute);
  });

  it('traces 422 InboundParseProcessingError once and does not rethrow', async () => {
    domainRouteStrategy.execute.rejects(
      new InboundParseProcessingError('Domain is not verified', {
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
        strategy: 'domain-route',
        status: 422,
        message: 'Domain is not verified',
      })
    );

    await usecase.execute(buildCommand());

    sinon.assert.calledOnce(logInboundEmailRequest.execute);
    expect(logInboundEmailRequest.execute.getCall(0).args[0].outcome.status).to.equal(422);
  });

  it('rethrows 502 InboundParseProcessingError without tracing so BullMQ can retry', async () => {
    domainRouteStrategy.execute.rejects(
      new InboundParseProcessingError('Response code 500 (Internal Server Error)', {
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
        strategy: 'agent',
        status: 502,
        message: INBOUND_DELIVERY_FAILURE_CUSTOMER_MESSAGE,
      })
    );

    try {
      await usecase.execute(buildCommand());
      throw new Error('Expected InboundParseProcessingError');
    } catch (error) {
      expect(error).to.be.instanceOf(InboundParseProcessingError);
    }

    sinon.assert.notCalled(logInboundEmailRequest.execute);
  });

  it('traces BadRequestException as a warning and does not rethrow', async () => {
    domainRouteStrategy.execute.rejects(new BadRequestException('No domain found'));

    await usecase.execute(buildCommand());

    sinon.assert.calledOnce(logInboundEmailRequest.logUnresolvedFailure);
    expect(logInboundEmailRequest.logUnresolvedFailure.getCall(0).args[0].severity).to.equal('warning');
  });

  it('traces InboundParseDroppedError as a warning and does not rethrow', async () => {
    domainRouteStrategy.execute.rejects(
      new InboundParseDroppedError('Shared agent domain: integration is inactive', {
        organizationId: 'org_1',
        environmentId: 'env_1',
      })
    );

    await usecase.execute(buildCommand());

    sinon.assert.calledOnce(logInboundEmailRequest.logUnresolvedFailure);
    expect(logInboundEmailRequest.logUnresolvedFailure.getCall(0).args[0].severity).to.equal('warning');
  });
});
