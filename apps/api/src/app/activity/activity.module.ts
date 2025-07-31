import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ActivityController } from './activity.controller';
import { GetRequests } from './usecases/get-requests/get-requests.usecase';
import { GetWorkflowRun } from './usecases/get-workflow-run/get-workflow-run.usecase';
import { GetWorkflowRuns } from './usecases/get-workflow-runs/get-workflow-runs.usecase';

const USE_CASES = [GetRequests, GetWorkflowRuns, GetWorkflowRun];

@Module({
  imports: [SharedModule],
  controllers: [ActivityController],
  providers: [...USE_CASES],
})
export class ActivityModule {}
