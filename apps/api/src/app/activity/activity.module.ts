import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { GetRequests } from './usecases/get-requests/get-requests.usecase';
import { SharedModule } from '../shared/shared.module';

const USE_CASES = [GetRequests];

@Module({
  imports: [SharedModule],
  controllers: [ActivityController],
  providers: [...USE_CASES],
})
export class ActivityModule {}
