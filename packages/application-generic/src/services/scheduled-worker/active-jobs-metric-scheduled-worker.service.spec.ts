import { Test } from '@nestjs/testing';

import { ActiveJobMetricScheduledWorkerService } from './active-jobs-metric-scheduled-worker.service';
import { Scheduler } from '../schedulers/providers/types';

let activeJobsMetricWorkerService: ActiveJobMetricScheduledWorkerService;

describe('Job metrics Scheduled Worker service', () => {
  const scheduler = {} as Scheduler;
  describe('General', () => {
    beforeAll(async () => {
      activeJobsMetricWorkerService = new ActiveJobMetricScheduledWorkerService(
        scheduler
      );
    });

    it('should be initialised properly', async () => {
      expect(activeJobsMetricWorkerService).toBeDefined();
      expect(Object.keys(activeJobsMetricWorkerService)).toEqual(
        expect.arrayContaining(['topic', 'instance'])
      );
      expect(activeJobsMetricWorkerService.topic).toEqual('active-job-metrics');
    });
  });
});
