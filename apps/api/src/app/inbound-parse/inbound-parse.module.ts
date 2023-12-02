import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CompileTemplate, QueuesModule } from '@novu/application-generic';

import { USE_CASES } from './usecases';
import { InboundParseController } from './inbound-parse.controller';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { JobTopicNameEnum } from '@novu/shared';

const PROVIDERS = [GetMxRecord, CompileTemplate];

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [InboundParseController],
  providers: [...PROVIDERS, ...USE_CASES],
  exports: [...USE_CASES],
})
export class InboundParseModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
