import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  StepRunRepository,
  TraceRollupRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ProviderVolumeDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildProviderByVolumeChartCommand } from './build-provider-by-volume-chart.command';

@Injectable()
export class BuildProviderByVolumeChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private stepRunRepository: StepRunRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildProviderByVolumeChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildProviderByVolumeChartCommand): Promise<ProviderVolumeDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate, workflowIds } = command;

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
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_PROVIDER_VOLUME_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const providerData = useNewQuery
      ? await this.traceRollupRepository.getProviderVolumeData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        )
      : await this.stepRunRepository.getProviderVolumeData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        );

    return providerData.map((dataPoint) => ({
      providerId: dataPoint.provider_id,
      count: parseInt(dataPoint.count, 10),
    }));
  }
}
