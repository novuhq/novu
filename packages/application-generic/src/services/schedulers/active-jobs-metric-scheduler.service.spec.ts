import { Test } from '@nestjs/testing';

import { ActiveJobMetricSchedulerService } from './active-job-metric-scheduler.service';
import { Scheduler } from './providers/types';

let activeJobsMetricSchedulerService: ActiveJobMetricSchedulerService;

describe('Job metrics Scheduler service', () => {
  const scheduler = {} as Scheduler;
  describe('General', () => {
    beforeAll(async () => {
      activeJobsMetricSchedulerService = new ActiveJobMetricSchedulerService(
        scheduler
      );
    });

    it('should be initialised properly', async () => {
      expect(activeJobsMetricSchedulerService).toBeDefined();
      expect(Object.keys(activeJobsMetricSchedulerService)).toEqual(
        expect.arrayContaining(['topic', 'instance'])
      );
      expect(activeJobsMetricSchedulerService.topic).toEqual(
        'active-job-metrics'
      );
    });
  });
});
