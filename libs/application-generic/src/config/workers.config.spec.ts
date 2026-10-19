import {
  getInboundParseMailWorkerOptions,
  getStandardWorkerOptions,
  getSubscriberProcessWorkerOptions,
  getWebSocketWorkerOptions,
  getWorkflowWorkerOptions,
} from './workers';

const PER_QUEUE_ENV_KEYS = [
  'INBOUND_PARSE_MAIL_WORKER_CONCURRENCY',
  'SUBSCRIBER_PROCESS_WORKER_CONCURRENCY',
  'STANDARD_WORKER_CONCURRENCY',
  'WEB_SOCKET_WORKER_CONCURRENCY',
  'WORKFLOW_WORKER_CONCURRENCY',
];

const env = process.env as Record<string, string | undefined>;

function clearConcurrencyEnvVars() {
  env.WORKER_DEFAULT_CONCURRENCY = '';
  env.WORKER_DEFAULT_LOCK_DURATION = '';
  for (const key of PER_QUEUE_ENV_KEYS) {
    env[key] = '';
  }
}

describe('Workers Config', () => {
  afterEach(() => {
    clearConcurrencyEnvVars();
  });

  describe('Inbound Parse Mail Worker', () => {
    it('should have the default values when no environment variable set', () => {
      expect(getInboundParseMailWorkerOptions()).toEqual({
        concurrency: 200,
        lockDuration: 90000,
      });
    });

    it('should have the values passed through the environment variables', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getInboundParseMailWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });
    });

    it('should use per-queue concurrency over default concurrency', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.INBOUND_PARSE_MAIL_WORKER_CONCURRENCY = '50';

      expect(getInboundParseMailWorkerOptions()).toEqual({
        concurrency: 50,
        lockDuration: 90000,
      });
    });

    it('should use per-queue concurrency when no default concurrency is set', () => {
      env.INBOUND_PARSE_MAIL_WORKER_CONCURRENCY = '75';

      expect(getInboundParseMailWorkerOptions()).toEqual({
        concurrency: 75,
        lockDuration: 90000,
      });
    });
  });

  describe('Standard Worker', () => {
    it('should have the default values when no environment variable set', () => {
      expect(getStandardWorkerOptions()).toEqual({
        concurrency: 200,
        lockDuration: 90000,
      });
    });

    it('should have the values passed through the environment variables', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getStandardWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });
    });

    it('should use per-queue concurrency over default concurrency', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.STANDARD_WORKER_CONCURRENCY = '25';

      expect(getStandardWorkerOptions()).toEqual({
        concurrency: 25,
        lockDuration: 90000,
      });
    });
  });

  describe('Subscriber Process Worker', () => {
    it('should have the default values when no environment variable set', () => {
      expect(getSubscriberProcessWorkerOptions()).toEqual({
        concurrency: 200,
        lockDuration: 90000,
      });
    });

    it('should have the values passed through the environment variables', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getSubscriberProcessWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });
    });

    it('should use per-queue concurrency over default concurrency', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.SUBSCRIBER_PROCESS_WORKER_CONCURRENCY = '150';

      expect(getSubscriberProcessWorkerOptions()).toEqual({
        concurrency: 150,
        lockDuration: 90000,
      });
    });
  });

  describe('Web Socket Worker', () => {
    it('should have the default values when no environment variable set', () => {
      expect(getWebSocketWorkerOptions()).toEqual({
        concurrency: 400,
        lockDuration: 90000,
      });
    });

    it('should have the values passed through the environment variables', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getWebSocketWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });
    });

    it('should use per-queue concurrency over default concurrency', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.WEB_SOCKET_WORKER_CONCURRENCY = '500';

      expect(getWebSocketWorkerOptions()).toEqual({
        concurrency: 500,
        lockDuration: 90000,
      });
    });
  });

  describe('Workflow Worker', () => {
    it('should have the default values when no environment variable set', () => {
      expect(getWorkflowWorkerOptions()).toEqual({
        concurrency: 200,
        lockDuration: 90000,
      });
    });

    it('should have the values passed through the environment variables', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getWorkflowWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });
    });

    it('should use per-queue concurrency over default concurrency', () => {
      env.WORKER_DEFAULT_CONCURRENCY = '100';
      env.WORKFLOW_WORKER_CONCURRENCY = '300';

      expect(getWorkflowWorkerOptions()).toEqual({
        concurrency: 300,
        lockDuration: 90000,
      });
    });
  });
});
