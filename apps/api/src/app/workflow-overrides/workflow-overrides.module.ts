import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { WorkflowOverridesController } from './workflow-overrides.controller';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [WorkflowOverridesController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class WorkflowOverridesModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
