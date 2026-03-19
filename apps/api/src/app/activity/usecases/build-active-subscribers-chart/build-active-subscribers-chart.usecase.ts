import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  TraceRollupRepository,
  WorkflowRunRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ActiveSubscribersDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildActiveSubscribersChartCommand } from './build-active-subscribers-chart.command';

@Injectable()
export class BuildActiveSubscribersChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private workflowRunRepository: WorkflowRunRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildActiveSubscribersChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildActiveSubscribersChartCommand): Promise<ActiveSubscribersDataPointDto> {
    const { environmentId, organizationId, startDate, endDate, workflowIds } = command;

    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    const featureFlagContext = {
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    };

    const [isGlobalEnabled, isDedicatedEnabled] = await Promise.all([
      this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_LOGS_READ_GLOBAL_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
      this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_ACTIVE_SUBSCRIBERS_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const result = useNewQuery
      ? await this.traceRollupRepository.getActiveSubscribersCount(
          environmentId,
          organizationId,
          startDate,
          endDate,
          previousStartDate,
          previousEndDate,
          workflowIds
        )
      : await this.workflowRunRepository.getActiveSubscribersData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          previousStartDate,
          previousEndDate,
          workflowIds
        );

    return {
      currentPeriod: result.currentPeriod,
      previousPeriod: result.previousPeriod,
    };
  }
}
