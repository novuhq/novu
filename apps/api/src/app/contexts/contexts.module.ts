import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ContextsController } from './contexts.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule],
  controllers: [ContextsController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class ContextsModule {}
