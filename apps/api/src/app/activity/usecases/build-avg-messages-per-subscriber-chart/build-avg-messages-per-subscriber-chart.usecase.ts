import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, StepRunRepository } from '@novu/application-generic';
import { AvgMessagesPerSubscriberDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildAvgMessagesPerSubscriberChartCommand } from './build-avg-messages-per-subscriber-chart.command';

@Injectable()
export class BuildAvgMessagesPerSubscriberChart {
  constructor(
    private stepRunRepository: StepRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildAvgMessagesPerSubscriberChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildAvgMessagesPerSubscriberChartCommand): Promise<AvgMessagesPerSubscriberDataPointDto> {
    const { environmentId, organizationId, startDate, endDate } = command;

    // Calculate previous period dates
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    const result = await this.stepRunRepository.getAvgMessagesPerSubscriberData(
      environmentId,
      organizationId,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate
    );

    return {
      currentPeriod: result.currentPeriod,
      previousPeriod: result.previousPeriod,
    };
  }
}
