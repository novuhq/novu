import { Test } from '@nestjs/testing';

import { ScheduledWorkerBaseService } from './scheduled-worker-base.service';
import { SchedulerTopicNameEnum } from '@novu/shared';
import { Scheduler } from '../schedulers/providers/types';

let scheduledWorkerBaseService: ScheduledWorkerBaseService;

describe('base Scheduled worker service', () => {
  const scheduler = {} as Scheduler;
  scheduler.define = jest.fn();
  scheduler.stop = jest.fn();
  describe('General', () => {
    beforeAll(async () => {
      scheduledWorkerBaseService = new ScheduledWorkerBaseService(
        SchedulerTopicNameEnum.ACTIVE_JOB_METRICS,
        scheduler
      );
    });

    it('should be initialised properly', async () => {
      expect(scheduledWorkerBaseService).toBeDefined();
      expect(Object.keys(scheduledWorkerBaseService)).toEqual(
        expect.arrayContaining(['topic', 'instance'])
      );
      expect(scheduledWorkerBaseService.topic).toEqual('active-job-metrics');
    });

    it('should be able to define the processor', async () => {
      const processor = () => Promise.resolve();
      scheduledWorkerBaseService.initWorker(processor);
      expect(scheduler.define).toHaveBeenCalledWith(
        'active-job-metrics',
        processor,
        undefined
      );
    });
    it('should be able to gracefully shutdown', async () => {
      await scheduledWorkerBaseService.gracefulShutdown();
      expect(scheduler.stop).toHaveBeenCalledWith();
    });
  });
});
