import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { InternalController } from './internal.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [InternalController],
})
export class InternalModule {}
