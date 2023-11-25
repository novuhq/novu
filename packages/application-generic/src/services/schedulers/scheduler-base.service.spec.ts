import { Test } from '@nestjs/testing';

import { SchedulerBaseService } from './scheduler-base.service';
import { Scheduler } from './providers/types';
import { SchedulerTopicNameEnum } from '@novu/shared';

let schedulerBaseService: SchedulerBaseService;

describe('Base Scheduler service', () => {
  const scheduler = {} as Scheduler;
  scheduler.schedule = jest.fn();
  scheduler.every = jest.fn();
  describe('General', () => {
    beforeAll(async () => {
      schedulerBaseService = new SchedulerBaseService(
        SchedulerTopicNameEnum.ACTIVE_JOB_METRICS,
        scheduler
      );
    });

    it('should be initialised properly', async () => {
      expect(schedulerBaseService).toBeDefined();
      expect(Object.keys(schedulerBaseService)).toEqual(
        expect.arrayContaining(['topic', 'instance'])
      );
      expect(schedulerBaseService.topic).toEqual('active-job-metrics');
    });

    it('should be able to schedule tasks', async () => {
      schedulerBaseService.schedule('now', { a: 'c' });
      expect(scheduler.schedule).toHaveBeenCalledWith(
        'now',
        'active-job-metrics',
        { a: 'c' }
      );
    });
    it('should be able to schedule repeated tasks', async () => {
      schedulerBaseService.every('now', { a: 'c' });
      expect(scheduler.every).toHaveBeenCalledWith(
        'now',
        'active-job-metrics',
        { a: 'c' }
      );
    });
  });
});
