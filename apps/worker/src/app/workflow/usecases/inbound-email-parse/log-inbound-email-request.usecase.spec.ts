import { InboundMailRequestLogger, PinoLogger } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { InboundParseOutcome } from './inbound-parse-outcome';
import { LogInboundEmailRequest } from './log-inbound-email-request.usecase';

function buildCommand(overrides: Partial<InboundEmailParseCommand> = {}): InboundEmailParseCommand {
  return {
    html: '<b>secret body</b>',
    text: 'secret body',
    subject: 'Hello there',
    messageId: 'abc-123@example.com',
    from: [{ address: 'sender@example.com', name: 'Sender' }],
    to: [{ address: 'parse@inbound.example.com', name: '' }],
    dkim: 'pass',
    spf: 'pass',
    spamScore: 1,
    attachments: [{ filename: 'a.pdf', contentType: 'application/pdf', size: 10 }],
    connection: { remoteAddress: '203.0.113.5', clientHostname: 'mta.example.com' },
    requestLogId: 'req_abc',
    ...overrides,
  } as unknown as InboundEmailParseCommand;
}

describe('LogInboundEmailRequest', () => {
  let sandbox: sinon.SinonSandbox;
  let inboundMailRequestLogger: sinon.SinonStubbedInstance<InboundMailRequestLogger>;
  let usecase: LogInboundEmailRequest;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    inboundMailRequestLogger = sandbox.createStubInstance(InboundMailRequestLogger);
    inboundMailRequestLogger.logCompleted.resolves();

    usecase = new LogInboundEmailRequest(
      inboundMailRequestLogger as unknown as InboundMailRequestLogger,
      sandbox.createStubInstance(PinoLogger) as unknown as PinoLogger
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  const successOutcome: InboundParseOutcome = {
    organizationId: 'org_1',
    environmentId: 'env_1',
    transactionId: 'txn_1',
    strategy: 'domain-route',
    status: 200,
  };

  it('no-ops when requestLogId is missing (legacy jobs queued pre-rollout)', async () => {
    await usecase.execute({
      command: buildCommand({ requestLogId: undefined }),
      outcome: successOutcome,
    });

    sinon.assert.notCalled(inboundMailRequestLogger.logCompleted);
  });

  it('emits request_delivered for a 200 outcome', async () => {
    await usecase.execute({ command: buildCommand(), outcome: successOutcome });

    sinon.assert.calledOnce(inboundMailRequestLogger.logCompleted);
    const arg = inboundMailRequestLogger.logCompleted.getCall(0).args[0];
    expect(arg.delivered).to.equal(true);
    expect(arg.severity).to.equal('success');
    expect(arg.requestLogId).to.equal('req_abc');
    expect(arg.organizationId).to.equal('org_1');
    expect(arg.environmentId).to.equal('env_1');
    expect(arg.transactionId).to.equal('txn_1');
  });

  it('emits request_failed with warning severity for 422 outcomes (non-retriable)', async () => {
    await usecase.execute({
      command: buildCommand(),
      outcome: { ...successOutcome, status: 422, message: 'No matching route' },
    });

    const arg = inboundMailRequestLogger.logCompleted.getCall(0).args[0];
    expect(arg.delivered).to.equal(false);
    expect(arg.severity).to.equal('warning');
    expect(arg.message).to.equal('No matching route');
  });

  it('emits request_failed with error severity for 502 outcomes (downstream failure)', async () => {
    await usecase.execute({
      command: buildCommand(),
      outcome: {
        ...successOutcome,
        status: 502,
        message: 'Inbound delivery failed due to a temporary internal error',
      },
    });

    const arg = inboundMailRequestLogger.logCompleted.getCall(0).args[0];
    expect(arg.delivered).to.equal(false);
    expect(arg.severity).to.equal('error');
    expect(arg.message).to.equal('Inbound delivery failed due to a temporary internal error');
  });

  describe('logUnresolvedFailure', () => {
    it('skips when no requestLogId is provided (legacy job safety net)', async () => {
      await usecase.logUnresolvedFailure({ requestLogId: '', message: 'malformed address' });

      sinon.assert.notCalled(inboundMailRequestLogger.logCompleted);
    });

    it('emits a warning trace for non-retriable drops', async () => {
      await usecase.logUnresolvedFailure({
        requestLogId: 'req_abc',
        message: 'Shared agent inbox: integration is inactive',
        severity: 'warning',
        environmentId: 'env_2',
      });

      const arg = inboundMailRequestLogger.logCompleted.getCall(0).args[0];
      expect(arg.requestLogId).to.equal('req_abc');
      expect(arg.delivered).to.equal(false);
      expect(arg.severity).to.equal('warning');
      expect(arg.environmentId).to.equal('env_2');
      expect(arg.message).to.equal('Shared agent inbox: integration is inactive');
    });

    it('defaults severity to error when not provided', async () => {
      await usecase.logUnresolvedFailure({ requestLogId: 'req_abc', message: 'Unexpected throw' });

      const arg = inboundMailRequestLogger.logCompleted.getCall(0).args[0];
      expect(arg.severity).to.equal('error');
    });
  });

  it('swallows write failures so the worker can continue', async () => {
    inboundMailRequestLogger.logCompleted.rejects(new Error('clickhouse down'));

    await usecase.execute({ command: buildCommand(), outcome: successOutcome });
  });
});
