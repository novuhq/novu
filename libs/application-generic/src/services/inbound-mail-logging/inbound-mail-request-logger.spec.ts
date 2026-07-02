import { PinoLogger } from 'nestjs-pino';
import { RequestLogRepository, TraceLogRepository } from '../analytic-logs';
import { InboundMailRequestLogger } from './inbound-mail-request-logger';
import { InboundRequestSource } from './inbound-request-metadata';

const ORIGINAL_ANALYTICS = process.env.IS_ANALYTICS_LOGS_ENABLED;
const ORIGINAL_INBOUND = process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED;

function buildSource(): InboundRequestSource {
  return {
    subject: 'Hello there',
    messageId: 'abc-123@example.com',
    from: [{ address: 'sender@example.com', name: 'Sender' }],
    to: [{ address: 'parse@inbound.example.com', name: '' }],
    dkim: 'pass',
    spf: 'pass',
    spamScore: 1,
    attachments: [{ filename: 'a.pdf', contentType: 'application/pdf', size: 10 }],
    connection: { remoteAddress: '203.0.113.5', clientHostname: 'mta.example.com' } as any,
  };
}

describe('InboundMailRequestLogger', () => {
  let requestLogRepository: jest.Mocked<Pick<RequestLogRepository, 'create' | 'identifierPrefix'>>;
  let traceLogRepository: jest.Mocked<Pick<TraceLogRepository, 'createRequest'>>;
  let logger: InboundMailRequestLogger;
  let pinoLogger: jest.Mocked<PinoLogger>;

  beforeEach(() => {
    requestLogRepository = {
      create: jest.fn().mockResolvedValue(undefined),
      identifierPrefix: 'req_',
    } as any;
    traceLogRepository = {
      createRequest: jest.fn().mockResolvedValue(undefined),
    } as any;
    pinoLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    logger = new InboundMailRequestLogger(
      requestLogRepository as unknown as RequestLogRepository,
      traceLogRepository as unknown as TraceLogRepository,
      pinoLogger
    );
  });

  afterEach(() => {
    if (ORIGINAL_ANALYTICS === undefined) {
      delete process.env.IS_ANALYTICS_LOGS_ENABLED;
    } else {
      process.env.IS_ANALYTICS_LOGS_ENABLED = ORIGINAL_ANALYTICS;
    }

    if (ORIGINAL_INBOUND === undefined) {
      delete process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED;
    } else {
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = ORIGINAL_INBOUND;
    }
  });

  describe('logReceived', () => {
    it('returns null when feature flags are disabled', async () => {
      process.env.IS_ANALYTICS_LOGS_ENABLED = 'false';
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';

      const result = await logger.logReceived({
        source: buildSource(),
        toAddress: 'foo@example.com',
        tenant: { organizationId: 'org_1', environmentId: 'env_1', transactionId: 'txn_1' },
        durationMs: 5,
      });

      expect(result).toBeNull();
      expect(requestLogRepository.create).not.toHaveBeenCalled();
    });

    it('writes an early row with status_code 202 and a request_received trace', async () => {
      process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';

      const requestLogId = await logger.logReceived({
        source: buildSource(),
        toAddress: 'support@customer.com',
        tenant: { organizationId: 'org_1', environmentId: 'env_1', transactionId: 'txn_1' },
        durationMs: 42,
      });

      expect(requestLogId).toMatch(/^req_/);
      expect(requestLogRepository.create).toHaveBeenCalledTimes(1);
      const [row, context] = requestLogRepository.create.mock.calls[0];
      expect(row.source).toBe('inbound_email');
      expect(row.method).toBe('INBOUND');
      expect(row.status_code).toBe(202);
      expect(row.path).toBe('/inbound-mail/domain-route');
      expect(row.transaction_id).toBe('txn_1');
      expect(row.duration_ms).toBe(42);
      expect(context).toEqual({ organizationId: 'org_1', environmentId: 'env_1' });

      // request_body carries metadata only; never the raw html/text bodies (PII).
      const metadata = JSON.parse(row.request_body);
      expect(metadata.subject).toBe('Hello there');
      expect(metadata.html).toBeUndefined();
      expect(metadata.text).toBeUndefined();

      expect(traceLogRepository.createRequest).toHaveBeenCalledTimes(1);
      const [traces] = traceLogRepository.createRequest.mock.calls[0];
      expect(traces).toHaveLength(1);
      expect(traces[0].event_type).toBe('request_received');
      expect(traces[0].entity_id).toBe(requestLogId);
      expect(traces[0].status).toBe('success');
    });

    it('infers reply-to strategy for legacy reply-to addresses', async () => {
      process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';

      await logger.logReceived({
        source: buildSource(),
        toAddress: 'parse+txn-nv-e=env_1@reply.novu.co',
        tenant: { organizationId: '', environmentId: 'env_1', transactionId: 'txn' },
        durationMs: 1,
      });

      const [row] = requestLogRepository.create.mock.calls[0];
      expect(row.path).toBe('/inbound-mail/reply-to');
    });

    it('returns null when the row write fails', async () => {
      process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';
      requestLogRepository.create.mockRejectedValueOnce(new Error('clickhouse down'));

      const result = await logger.logReceived({
        source: buildSource(),
        toAddress: 'foo@example.com',
        tenant: { organizationId: 'org_1', environmentId: 'env_1', transactionId: 'txn_1' },
        durationMs: 1,
      });

      expect(result).toBeNull();
      expect(traceLogRepository.createRequest).not.toHaveBeenCalled();
    });
  });

  describe('logQueued', () => {
    beforeEach(() => {
      process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';
    });

    it('emits a request_queued trace linked to the requestLogId', async () => {
      await logger.logQueued({
        requestLogId: 'req_abc',
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
      });

      const [traces] = traceLogRepository.createRequest.mock.calls[0];
      expect(traces[0].event_type).toBe('request_queued');
      expect(traces[0].entity_id).toBe('req_abc');
      expect(traces[0].status).toBe('success');
    });

    it('no-ops when no requestLogId is provided', async () => {
      await logger.logQueued({
        requestLogId: '',
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
      });

      expect(traceLogRepository.createRequest).not.toHaveBeenCalled();
    });
  });

  describe('logProcessingFailed', () => {
    it('emits a request_failed trace with the processing failure reason', async () => {
      process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';

      await logger.logProcessingFailed({
        requestLogId: 'req_abc',
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
        message: 'Unable to parse email',
      });

      const [traces] = traceLogRepository.createRequest.mock.calls[0];
      expect(traces[0].event_type).toBe('request_failed');
      expect(traces[0].status).toBe('error');
      expect(traces[0].message).toBe('Unable to parse email');
    });
  });

  describe('logQueueFailed', () => {
    it('emits a request_failed trace with the failure reason', async () => {
      process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';

      await logger.logQueueFailed({
        requestLogId: 'req_abc',
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
        message: 'Redis connection refused',
      });

      const [traces] = traceLogRepository.createRequest.mock.calls[0];
      expect(traces[0].event_type).toBe('request_failed');
      expect(traces[0].status).toBe('error');
      expect(traces[0].message).toBe('Redis connection refused');
    });
  });

  describe('logCompleted', () => {
    beforeEach(() => {
      process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';
      process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED = 'true';
    });

    it('writes request_delivered when delivered is true', async () => {
      await logger.logCompleted({
        requestLogId: 'req_abc',
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
        delivered: true,
      });

      const [traces] = traceLogRepository.createRequest.mock.calls[0];
      expect(traces[0].event_type).toBe('request_delivered');
      expect(traces[0].status).toBe('success');
    });

    it('writes request_failed with warning severity for 422 outcomes', async () => {
      await logger.logCompleted({
        requestLogId: 'req_abc',
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
        delivered: false,
        severity: 'warning',
        message: 'No matching inbound route',
      });

      const [traces] = traceLogRepository.createRequest.mock.calls[0];
      expect(traces[0].event_type).toBe('request_failed');
      expect(traces[0].status).toBe('warning');
      expect(traces[0].message).toBe('No matching inbound route');
    });

    it('no-ops when no requestLogId is provided (backward compat with pre-rollout jobs)', async () => {
      await logger.logCompleted({
        requestLogId: '',
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'txn_1',
        delivered: true,
      });

      expect(traceLogRepository.createRequest).not.toHaveBeenCalled();
    });
  });
});
