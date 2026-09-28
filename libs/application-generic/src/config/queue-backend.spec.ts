import { JobTopicNameEnum, QueueBackend } from '@novu/shared';
import {
  collectQueueBackendConfigErrors,
  EVENTBRIDGE_SCHEDULER_ENV_VARS,
  getQueueBackend,
  isBullMqEnabled,
  isSqsPrimary,
} from './queue-backend';
import { restoreQueueBackendEnv } from './queue-backend.test-helpers';

describe('queue backend config', () => {
  afterEach(restoreQueueBackendEnv());

  describe('getQueueBackend', () => {
    it('should default to bullmq when unset', () => {
      delete process.env.QUEUE_BACKEND;

      expect(getQueueBackend()).toEqual(QueueBackend.BULLMQ);
    });

    it('should default to bullmq when blank', () => {
      process.env.QUEUE_BACKEND = '   ';

      expect(getQueueBackend()).toEqual(QueueBackend.BULLMQ);
    });

    it('should fall back to bullmq rather than throw on an unknown value', () => {
      process.env.QUEUE_BACKEND = 'kafka';

      expect(getQueueBackend()).toEqual(QueueBackend.BULLMQ);
    });

    it.each(Object.values(QueueBackend))('should read %s from the env', (backend) => {
      process.env.QUEUE_BACKEND = backend;

      expect(getQueueBackend()).toEqual(backend);
    });
  });

  describe('predicates', () => {
    it('should keep BullMQ enabled in bullmq and sqs_bullmq only', () => {
      process.env.QUEUE_BACKEND = QueueBackend.BULLMQ;
      expect(isBullMqEnabled()).toBe(true);

      process.env.QUEUE_BACKEND = QueueBackend.SQS_BULLMQ;
      expect(isBullMqEnabled()).toBe(true);

      process.env.QUEUE_BACKEND = QueueBackend.SQS;
      expect(isBullMqEnabled()).toBe(false);
    });

    it('should treat SQS as primary in sqs_bullmq and sqs only', () => {
      process.env.QUEUE_BACKEND = QueueBackend.BULLMQ;
      expect(isSqsPrimary()).toBe(false);

      process.env.QUEUE_BACKEND = QueueBackend.SQS_BULLMQ;
      expect(isSqsPrimary()).toBe(true);

      process.env.QUEUE_BACKEND = QueueBackend.SQS;
      expect(isSqsPrimary()).toBe(true);
    });
  });

  describe('collectQueueBackendConfigErrors', () => {
    it('should require nothing in bullmq mode', () => {
      const errors = collectQueueBackendConfigErrors({
        topics: [JobTopicNameEnum.STANDARD],
        requiresScheduler: true,
        requiresPayloadOffload: true,
        env: { QUEUE_BACKEND: QueueBackend.BULLMQ },
      });

      expect(errors).toEqual([]);
    });

    it('should reject an unknown backend value', () => {
      const errors = collectQueueBackendConfigErrors({
        topics: [],
        env: { QUEUE_BACKEND: 'shadow' },
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('QUEUE_BACKEND must be one of');
    });

    it('should demand a queue url for each topic the process uses', () => {
      const errors = collectQueueBackendConfigErrors({
        topics: [JobTopicNameEnum.STANDARD, JobTopicNameEnum.WEB_SOCKETS],
        env: {
          QUEUE_BACKEND: QueueBackend.SQS_BULLMQ,
          SQS_QUEUE_URL_STANDARD: 'https://sqs.us-east-1.amazonaws.com/1/standard',
        },
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('SQS_QUEUE_URL_WEB_SOCKETS');
    });

    it('should not demand urls for topics the process does not use', () => {
      const errors = collectQueueBackendConfigErrors({
        topics: [JobTopicNameEnum.WEB_SOCKETS],
        env: {
          QUEUE_BACKEND: QueueBackend.SQS,
          SQS_QUEUE_URL_WEB_SOCKETS: 'https://sqs.us-east-1.amazonaws.com/1/ws',
        },
      });

      expect(errors).toEqual([]);
    });

    it('should treat a blank url as missing', () => {
      const errors = collectQueueBackendConfigErrors({
        topics: [JobTopicNameEnum.STANDARD],
        env: { QUEUE_BACKEND: QueueBackend.SQS_BULLMQ, SQS_QUEUE_URL_STANDARD: '  ' },
      });

      expect(errors).toHaveLength(1);
    });

    it('should only require the scheduler once BullMQ is gone', () => {
      const env = {
        SQS_QUEUE_URL_STANDARD: 'https://sqs.us-east-1.amazonaws.com/1/standard',
      };

      expect(
        collectQueueBackendConfigErrors({
          topics: [JobTopicNameEnum.STANDARD],
          requiresScheduler: true,
          env: { ...env, QUEUE_BACKEND: QueueBackend.SQS_BULLMQ },
        })
      ).toEqual([]);

      expect(
        collectQueueBackendConfigErrors({
          topics: [JobTopicNameEnum.STANDARD],
          requiresScheduler: true,
          env: { ...env, QUEUE_BACKEND: QueueBackend.SQS },
        })
      ).toHaveLength(EVENTBRIDGE_SCHEDULER_ENV_VARS.length);
    });

    it('should require the payload offload bucket in both sqs modes', () => {
      const errors = collectQueueBackendConfigErrors({
        topics: [JobTopicNameEnum.INBOUND_PARSE_MAIL],
        requiresPayloadOffload: true,
        env: {
          QUEUE_BACKEND: QueueBackend.SQS_BULLMQ,
          SQS_QUEUE_URL_INBOUND_PARSE_MAIL: 'https://sqs.us-east-1.amazonaws.com/1/inbound',
        },
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('SQS_PAYLOAD_OFFLOAD_BUCKET');
    });
  });
});
