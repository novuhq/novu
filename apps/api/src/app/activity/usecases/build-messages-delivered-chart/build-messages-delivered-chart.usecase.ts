import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, MessageSentCountsRepository, PinoLogger } from '@novu/application-generic';
import { MessagesDeliveredDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildMessagesDeliveredChartCommand } from './build-messages-delivered-chart.command';

@Injectable()
export class BuildMessagesDeliveredChart {
  constructor(
    private messageSentCountsRepository: MessageSentCountsRepository,
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

    const result = await this.messageSentCountsRepository.getMessagesSentData(
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
