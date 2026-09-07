import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { StorageController } from './storage.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [StorageController],
})
export class StorageModule {}
