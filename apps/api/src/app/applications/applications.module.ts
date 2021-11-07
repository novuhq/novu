import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { ApplicationsController } from './applications.controller';

@Module({
  imports: [SharedModule],
  controllers: [ApplicationsController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class ApplicationsModule {}
