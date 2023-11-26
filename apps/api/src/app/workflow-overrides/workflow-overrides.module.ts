import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { WorkflowOverridesController } from './workflow-overrides.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [WorkflowOverridesController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class WorkflowOverridesModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
