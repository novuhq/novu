import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { StorageController } from './storage.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [StorageController],
})
export class StorageModule {}
