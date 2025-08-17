import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, StepRunRepository } from '@novu/application-generic';
import { ProviderVolumeDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildProviderByVolumeChartCommand } from './build-provider-by-volume-chart.command';

@Injectable()
export class BuildProviderByVolumeChart {
  constructor(
    private stepRunRepository: StepRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildProviderByVolumeChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildProviderByVolumeChartCommand): Promise<ProviderVolumeDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate } = command;

    const providerData = await this.stepRunRepository.getProviderVolumeData(
      environmentId,
      organizationId,
      startDate,
      endDate
    );

    return providerData.map((dataPoint) => ({
      providerId: dataPoint.provider_id,
      count: parseInt(dataPoint.count, 10),
    }));
  }
}
