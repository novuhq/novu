import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { QueuesModule } from '@novu/application-generic';

import { HealthController } from './health.controller';
import { SharedModule } from '../shared/shared.module';
import { JobTopicNameEnum } from '@novu/shared';

@Module({
  imports: [
    SharedModule,
    TerminusModule,
    QueuesModule.forRoot([JobTopicNameEnum.WORKFLOW, JobTopicNameEnum.INBOUND_PARSE_MAIL]),
  ],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
