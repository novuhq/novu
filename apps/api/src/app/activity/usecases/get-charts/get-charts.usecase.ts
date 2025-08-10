import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { subDays } from 'date-fns';
import {
  ChartDataPointDto,
  GetChartsResponseDto,
  MessagesDeliveredDataPointDto,
  WorkflowVolumeDataPointDto,
} from '../../dtos/get-charts.response.dto';
import { ReportTypeEnum } from '../../dtos/shared.dto';
import { BuildDeliveryTrendChart, BuildDeliveryTrendChartCommand } from '../build-delivery-trend-chart';
import { BuildMessagesDeliveredChart, BuildMessagesDeliveredChartCommand } from '../build-messages-delivered-chart';
import { BuildWorkflowByVolumeChart, BuildWorkflowByVolumeChartCommand } from '../build-workflow-by-volume-chart';
import { GetChartsCommand } from './get-charts.command';

@Injectable()
export class GetCharts {
  constructor(
    private buildDeliveryTrendChart: BuildDeliveryTrendChart,
    private buildWorkflowByVolumeChart: BuildWorkflowByVolumeChart,
    private buildMessagesDeliveredChart: BuildMessagesDeliveredChart,
    private logger: PinoLogger
  ) {
    this.logger.setContext(GetCharts.name);
  }

  async execute(command: GetChartsCommand): Promise<GetChartsResponseDto> {
    const { createdAtGte, createdAtLte, reportType, environmentId, organizationId } = command;

    const endDate = createdAtLte ? new Date(createdAtLte) : new Date();
    const startDate = createdAtGte ? new Date(createdAtGte) : subDays(new Date(), 30);
    const data: Record<
      ReportTypeEnum,
      ChartDataPointDto[] | WorkflowVolumeDataPointDto[] | MessagesDeliveredDataPointDto
    > = {} as Record<
      ReportTypeEnum,
      ChartDataPointDto[] | WorkflowVolumeDataPointDto[] | MessagesDeliveredDataPointDto
    >;

    if (reportType.includes(ReportTypeEnum.DELIVERY_TREND)) {
      data[ReportTypeEnum.DELIVERY_TREND] = await this.buildDeliveryTrendChart.execute(
        BuildDeliveryTrendChartCommand.create({
          environmentId,
          organizationId,
          startDate,
          endDate,
        })
      );
    }

    if (reportType.includes(ReportTypeEnum.WORKFLOW_BY_VOLUME)) {
      data[ReportTypeEnum.WORKFLOW_BY_VOLUME] = await this.buildWorkflowByVolumeChart.execute(
        BuildWorkflowByVolumeChartCommand.create({
          environmentId,
          organizationId,
          startDate,
          endDate,
        })
      );
    }

    if (reportType.includes(ReportTypeEnum.MESSAGES_DELIVERED)) {
      data[ReportTypeEnum.MESSAGES_DELIVERED] = await this.buildMessagesDeliveredChart.execute(
        Object.assign(new BuildMessagesDeliveredChartCommand(), {
          environmentId,
          organizationId,
          startDate,
          endDate,
        })
      );
    }

    return {
      data,
    };
  }
}
