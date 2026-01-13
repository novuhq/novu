import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  StepRunRepository,
  TraceRollupRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { MessagesDeliveredDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildMessagesDeliveredChartCommand } from './build-messages-delivered-chart.command';

@Injectable()
export class BuildMessagesDeliveredChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private stepRunRepository: StepRunRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildMessagesDeliveredChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildMessagesDeliveredChartCommand): Promise<MessagesDeliveredDataPointDto> {
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
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_MESSAGE_DELIVERY_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const result = useNewQuery
      ? await this.traceRollupRepository.getMessageSendCount(
          environmentId,
          organizationId,
          startDate,
          endDate,
          previousStartDate,
          previousEndDate,
          workflowIds
        )
      : await this.stepRunRepository.getMessagesDeliveredData(
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
