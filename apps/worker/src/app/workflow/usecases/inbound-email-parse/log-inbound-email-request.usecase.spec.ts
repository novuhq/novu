import { PinoLogger, RequestLogRepository, TraceLogRepository } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { InboundParseOutcome } from './inbound-parse-outcome';
import { LogInboundEmailRequest } from './log-inbound-email-request.usecase';

const ORIGINAL_ANALYTICS = process.env.IS_ANALYTICS_LOGS_ENABLED;
const ORIGINAL_INBOUND = process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED;

function buildCommand(): InboundEmailParseCommand {
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
  } as unknown as InboundEmailParseCommand;
}

describe('LogInboundEmailRequest', () => {
  let sandbox: sinon.SinonSandbox;
  let requestLogRepository: sinon.SinonStubbedInstance<RequestLogRepository>;
  let traceLogRepository: sinon.SinonStubbedInstance<TraceLogRepository>;
  let usecase: LogInboundEmailRequest;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    requestLogRepository = sandbox.createStubInstance(RequestLogRepository);
    traceLogRepository = sandbox.createStubInstance(TraceLogRepository);
    (requestLogRepository as any).identifierPrefix = 'req_';
    requestLogRepository.create.resolves();
    traceLogRepository.createRequest.resolves();

    usecase = new LogInboundEmailRequest(
      requestLogRepository as unknown as RequestLogRepository,
      traceLogRepository as unknown as TraceLogRepository,
      sandbox.createStubInstance(PinoLogger) as unknown as PinoLogger
    );
  });

  afterEach(() => {
    sandbox.restore();
    process.env.IS_ANALYTICS_LOGS_ENABLED = ORIGINAL_ANALYTICS;
    process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = ORIGINAL_INBOUND;
  });

  const successOutcome: InboundParseOutcome = {
    organizationId: 'org_1',
    environmentId: 'env_1',
    transactionId: 'txn_1',
    strategy: 'domain-route',
    status: 200,
  };

  it('writes nothing when the feature flags are disabled', async () => {
    process.env.IS_ANALYTICS_LOGS_ENABLED = 'false';
    process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'false';

    await usecase.execute({ command: buildCommand(), outcome: successOutcome, durationMs: 5 });

    sinon.assert.notCalled(requestLogRepository.create);
    sinon.assert.notCalled(traceLogRepository.createRequest);
  });

  it('writes nothing when only the shared analytics flag is enabled', async () => {
    process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
    process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'false';

    await usecase.execute({ command: buildCommand(), outcome: successOutcome, durationMs: 5 });

    sinon.assert.notCalled(requestLogRepository.create);
  });

  it('writes a source=inbound_email row and lifecycle traces on success', async () => {
    process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
    process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';

    await usecase.execute({ command: buildCommand(), outcome: successOutcome, durationMs: 42 });

    sinon.assert.calledOnce(requestLogRepository.create);
    const [row, context] = requestLogRepository.create.getCall(0).args;
    expect(row.source).to.equal('inbound_email');
    expect(row.method).to.equal('INBOUND');
    expect(row.status_code).to.equal(200);
    expect(row.path).to.equal('/inbound-mail/domain-route');
    expect(row.transaction_id).to.equal('txn_1');
    expect(row.ip).to.equal('203.0.113.5');
    expect(row.hostname).to.equal('mta.example.com');
    expect(row.duration_ms).to.equal(42);
    expect(row.organization_id).to.equal('org_1');
    expect(row.environment_id).to.equal('env_1');
    expect(context).to.deep.equal({ organizationId: 'org_1', environmentId: 'env_1' });

    // request_body carries metadata only; never the raw html/text bodies (PII).
    expect(row.request_body).to.not.contain('secret body');
    const metadata = JSON.parse(row.request_body);
    expect(metadata.subject).to.equal('Hello there');
    expect(metadata.from).to.deep.equal(['sender@example.com']);
    expect(metadata.attachments).to.deep.equal([{ filename: 'a.pdf', contentType: 'application/pdf', size: 10 }]);
    expect(metadata.html).to.be.undefined;
    expect(metadata.text).to.be.undefined;

    sinon.assert.calledOnce(traceLogRepository.createRequest);
    const traces = traceLogRepository.createRequest.getCall(0).args[0];
    expect(traces).to.have.length(2);
    expect(traces[0].event_type).to.equal('request_received');
    expect(traces[0].entity_id).to.equal(row.id);
    expect(traces[1].event_type).to.equal('request_queued');
    expect(traces[1].status).to.equal('success');
  });

  it('emits a request_failed trace for failure outcomes', async () => {
    process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
    process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';

    await usecase.execute({
      command: buildCommand(),
      outcome: { ...successOutcome, status: 502, message: 'Inbound delivery failed' },
      durationMs: 10,
    });

    const row = requestLogRepository.create.getCall(0).args[0];
    expect(row.status_code).to.equal(502);

    const traces = traceLogRepository.createRequest.getCall(0).args[0];
    expect(traces[1].event_type).to.equal('request_failed');
    expect(traces[1].status).to.equal('error');
    expect(traces[1].message).to.equal('Inbound delivery failed');
  });
});
