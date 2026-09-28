import { JobTopicNameEnum } from '@novu/shared';
import { expect } from 'chai';
import { getRequiredWorkerTopics, parseActiveWorkers } from './worker-topics';

describe('worker topics', () => {
  describe('parseActiveWorkers', () => {
    it('should accept the BullMQ-only metrics worker alongside SQS workers', () => {
      expect(parseActiveWorkers('standard, metric-active-jobs')).to.deep.equal([
        JobTopicNameEnum.STANDARD,
        JobTopicNameEnum.ACTIVE_JOBS_METRIC,
      ]);
    });

    it('should accept a process that only runs the metrics worker', () => {
      expect(parseActiveWorkers('metric-active-jobs')).to.deep.equal([JobTopicNameEnum.ACTIVE_JOBS_METRIC]);
    });

    it('should reject a name that is not a worker', () => {
      expect(() => parseActiveWorkers('standard,not-a-worker')).to.throw(
        'Invalid worker "not-a-worker" in ACTIVE_WORKERS'
      );
    });
  });

  describe('getRequiredWorkerTopics', () => {
    it('should not demand an SQS queue for the metrics worker', () => {
      const topics = getRequiredWorkerTopics([JobTopicNameEnum.STANDARD, JobTopicNameEnum.ACTIVE_JOBS_METRIC]);

      expect(topics).to.include(JobTopicNameEnum.STANDARD);
      expect(topics).to.include(JobTopicNameEnum.WEB_SOCKETS);
      expect(topics).to.not.include(JobTopicNameEnum.ACTIVE_JOBS_METRIC);
    });

    it('should demand no SQS queues when the process only runs metrics', () => {
      expect(getRequiredWorkerTopics([JobTopicNameEnum.ACTIVE_JOBS_METRIC])).to.deep.equal([]);
    });

    it('should keep every SQS worker when ACTIVE_WORKERS is empty', () => {
      const topics = getRequiredWorkerTopics([]);

      expect(topics).to.include(JobTopicNameEnum.STANDARD);
      expect(topics).to.include(JobTopicNameEnum.WORKFLOW);
      expect(topics).to.include(JobTopicNameEnum.PROCESS_SUBSCRIBER);
      expect(topics).to.include(JobTopicNameEnum.INBOUND_PARSE_MAIL);
      expect(topics).to.not.include(JobTopicNameEnum.ACTIVE_JOBS_METRIC);
    });
  });
});
