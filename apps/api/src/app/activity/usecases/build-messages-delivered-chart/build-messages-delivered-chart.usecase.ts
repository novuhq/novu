import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, StepRunRepository } from '@novu/application-generic';
import { MessagesDeliveredDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildMessagesDeliveredChartCommand } from './build-messages-delivered-chart.command';

@Injectable()
export class BuildMessagesDeliveredChart {
  constructor(
    private stepRunRepository: StepRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildMessagesDeliveredChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildMessagesDeliveredChartCommand): Promise<MessagesDeliveredDataPointDto> {
    const { environmentId, organizationId, startDate, endDate } = command;

    // Calculate previous period dates
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1); // Day before start date
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    const result = await this.stepRunRepository.getMessagesDeliveredData(
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
