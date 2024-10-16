import { forwardRef, Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { StepSchemasController } from './step-schemas.controller';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [forwardRef(() => AuthModule), SharedModule],
  controllers: [StepSchemasController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class StepSchemasModule {}
