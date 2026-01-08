// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { CronExpressionEnum, JobCronNameEnum, TimezoneEnum } from '@novu/shared';
// import { CronService } from '../../../services/cron/cron.service';
// import { WorkflowRunRepository } from './workflow-run.repository';

// @Injectable()
// export class WorkflowRunOptimizeCronService implements OnModuleInit {
//   constructor(
//     private cronService: CronService,
//     private workflowRunRepository: WorkflowRunRepository
//   ) {}

//   async onModuleInit() {
//     await this.createOptimizeWorkflowRunsJob();
//   }

//   private async createOptimizeWorkflowRunsJob(): Promise<void> {
//     await this.cronService.add(
//       JobCronNameEnum.OPTIMIZE_WORKFLOW_RUNS_TABLE,
//       async () => {
//         await this.workflowRunRepository.optimizeRecentPartitions();
//       },
//       CronExpressionEnum.EVERY_5_MINUTES,
//       {
//         concurrency: 1,
//         lockLifetime: 5 * 60 * 1000,
//         timezone: TimezoneEnum.ETC_UTC,
//       }
//     );
//   }
// }
