import { Module } from '@nestjs/common';
import { EnvironmentsController } from './environments.controller';
import { GetEnvironmentTags } from './usecases/get-environment-tags';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [EnvironmentsController],
  providers: [GetEnvironmentTags],
  exports: [],
})
export class EnvironmentsModule {}
