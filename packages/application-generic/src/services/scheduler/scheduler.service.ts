import { Agenda } from '@hokify/agenda';
import { Injectable } from '@nestjs/common';
import { StandardQueueService } from '../queues';

@Injectable()
export class SchedulerService {
  private agenda: Agenda;

  constructor(private standardQueueService: StandardQueueService) {
    this.agenda = new Agenda({
      db: {
        collection: 'scheduledjobs',
        address: process.env.MONGO_URL,
      },
    });

    this.agenda.start().then(console.log).catch(console.error);
    this.agenda.define(
      'scheduled-jobs',
      async (job) => {
        await this.standardQueueService.addMinimalJob(
          job.attrs.data.id,
          job.attrs.data,
          job.attrs.data._organizationId
        );
      },
      {
        concurrency: 500,
      }
    );
  }

  public async scheduleJob(time: Date, data: Record<string, any>) {
    return await this.agenda.schedule(time, 'scheduled-jobs', data);
  }
}
