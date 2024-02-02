import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Agenda } from '@hokify/agenda';
import { PlatformException } from '../../../shared/utils';

const LOG_CONTEXT = 'CreateBillingJob';
const JOB_NAME = 'create-usage-records';
const BILLING_TIMEZONE = 'Etc/UTC';
const BILLING_CRON_INTERVAL = '0 * * * *';

@Injectable()
export class CreateBillingJob {
  constructor(protected moduleRef: ModuleRef, private agenda: Agenda) {}

  async execute(): Promise<void> {
    Logger.log('Creating usage records job', LOG_CONTEXT);
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        const module = await import('@novu/ee-billing');

        if (!module) {
          throw new PlatformException('Billing module is not loaded');
        }

        this.agenda.define(JOB_NAME, async (job) => {
          Logger.log('Starting usage records job', LOG_CONTEXT);
          try {
            const createUsageRecords = this.moduleRef.get(module.CreateUsageRecords, {
              strict: false,
            });

            await createUsageRecords.execute(
              module.CreateUsageRecordsCommand.create({
                startDate: new Date(job.attrs.lastRunAt || Date.now()),
              })
            );
          } catch (error) {
            Logger.error(`Failed to run usage records job: ${error}`, LOG_CONTEXT);
            throw error;
          }
          Logger.log('Completed usage records job', LOG_CONTEXT);
        });

        await this.agenda.every(BILLING_CRON_INTERVAL, JOB_NAME, { timezone: BILLING_TIMEZONE });

        Logger.log('Completed creation of usage records job', LOG_CONTEXT);
      }
    } catch (error) {
      Logger.error(`Failed to create usage records job: ${error}`, LOG_CONTEXT);
    }
  }
}
