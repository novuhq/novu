import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  TraceLogRepository,
  TraceRollupRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { TotalInteractionsDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildTotalInteractionsChartCommand } from './build-total-interactions-chart.command';

@Injectable()
export class BuildTotalInteractionsChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private traceLogRepository: TraceLogRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildTotalInteractionsChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildTotalInteractionsChartCommand): Promise<TotalInteractionsDataPointDto> {
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
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_TOTAL_INTERACTIONS_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const result = useNewQuery
      ? await this.traceRollupRepository.getTotalInteractionsCount(
          environmentId,
          organizationId,
          startDate,
          endDate,
          previousStartDate,
          previousEndDate,
          workflowIds
        )
      : await this.traceLogRepository.getTotalInteractionsData(
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
