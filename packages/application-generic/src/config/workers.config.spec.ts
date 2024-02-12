import {
  getInboundParseMailWorkerOptions,
  getStandardWorkerOptions,
  getSubscriberProcessWorkerOptions,
  getWebSocketWorkerOptions,
  getWorkflowWorkerOptions,
} from './workers';

describe('Workers Config', () => {
  describe('Inbound Parse Mail Worker', () => {
    it('should have the default values when no environment variable set', () => {
      expect(getInboundParseMailWorkerOptions()).toEqual({
        concurrency: 200,
        lockDuration: 90000,
      });
    });

    it('should have the values passed through the environment variables', () => {
      process.env.WORKER_DEFAULT_CONCURRENCY = '100';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getInboundParseMailWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });

      process.env.WORKER_DEFAULT_CONCURRENCY = '';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '';
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
      process.env.WORKER_DEFAULT_CONCURRENCY = '100';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getStandardWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });

      process.env.WORKER_DEFAULT_CONCURRENCY = '';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '';
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
      process.env.WORKER_DEFAULT_CONCURRENCY = '100';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getSubscriberProcessWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });

      process.env.WORKER_DEFAULT_CONCURRENCY = '';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '';
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
      process.env.WORKER_DEFAULT_CONCURRENCY = '100';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getWebSocketWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });

      process.env.WORKER_DEFAULT_CONCURRENCY = '';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '';
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
      process.env.WORKER_DEFAULT_CONCURRENCY = '100';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '10';

      expect(getWorkflowWorkerOptions()).toEqual({
        concurrency: 100,
        lockDuration: 10,
      });

      process.env.WORKER_DEFAULT_CONCURRENCY = '';
      process.env.WORKER_DEFAULT_LOCK_DURATION = '';
    });
  });
});
