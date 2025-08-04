import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { WorkflowModuleV1 } from '../workflows-v1/workflow-v1.module';
import { BlueprintController } from './blueprint.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, WorkflowModuleV1],
  controllers: [BlueprintController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class BlueprintModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
