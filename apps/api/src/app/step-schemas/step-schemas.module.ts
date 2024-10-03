import { forwardRef, Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { StepSchemasController } from './step-schemas.controller';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { BridgeModule } from '../bridge';
import { WorkflowModule } from '../workflows-v2/workflow.module';

@Module({
  imports: [forwardRef(() => AuthModule), SharedModule, BridgeModule, WorkflowModule],
  controllers: [StepSchemasController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class StepSchemasModule {}
