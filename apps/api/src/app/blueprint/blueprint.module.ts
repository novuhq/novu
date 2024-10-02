import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { BlueprintController } from './blueprint.controller';
import { WorkflowModuleV1 } from '../workflows-v1/workflow-v1.module';

@Module({
  imports: [SharedModule, WorkflowModuleV1],
  controllers: [BlueprintController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class BlueprintModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
