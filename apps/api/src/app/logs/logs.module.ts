import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { GetRequests } from './usecases/get-requests/get-requests.usecase';
import { SharedModule } from '../shared/shared.module';

const USE_CASES = [GetRequests];

@Module({
  imports: [SharedModule],
  controllers: [LogsController],
  providers: [...USE_CASES],
})
export class LogsModule {}
