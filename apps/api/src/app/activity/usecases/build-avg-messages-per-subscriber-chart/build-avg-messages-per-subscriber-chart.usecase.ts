import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  StepRunRepository,
  TraceRollupRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { AvgMessagesPerSubscriberDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildAvgMessagesPerSubscriberChartCommand } from './build-avg-messages-per-subscriber-chart.command';

@Injectable()
export class BuildAvgMessagesPerSubscriberChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private stepRunRepository: StepRunRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildAvgMessagesPerSubscriberChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildAvgMessagesPerSubscriberChartCommand): Promise<AvgMessagesPerSubscriberDataPointDto> {
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
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_AVG_MESSAGES_PER_SUBSCRIBER_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const result = useNewQuery
      ? await this.traceRollupRepository.getAvgMessagesPerSubscriberData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          previousStartDate,
          previousEndDate,
          workflowIds
        )
      : await this.stepRunRepository.getAvgMessagesPerSubscriberData(
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
