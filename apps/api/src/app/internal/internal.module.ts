import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases/index.js';
import { InternalController } from './internal.controller';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [InternalController],
})
export class InternalModule {}
