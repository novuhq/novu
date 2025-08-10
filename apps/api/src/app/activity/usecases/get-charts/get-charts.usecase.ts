import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { subDays } from 'date-fns';
import {
  ChartDataPointDto,
  GetChartsResponseDto,
  WorkflowVolumeDataPointDto,
} from '../../dtos/get-charts.response.dto';
import { ReportTypeEnum } from '../../dtos/shared.dto';
import { BuildDeliveryTrendChart, BuildDeliveryTrendChartCommand } from '../build-delivery-trend-chart';
import { BuildWorkflowByVolumeChart, BuildWorkflowByVolumeChartCommand } from '../build-workflow-by-volume-chart';
import { GetChartsCommand } from './get-charts.command';

@Injectable()
export class GetCharts {
  constructor(
    private buildDeliveryTrendChart: BuildDeliveryTrendChart,
    private buildWorkflowByVolumeChart: BuildWorkflowByVolumeChart,
    private logger: PinoLogger
  ) {
    this.logger.setContext(GetCharts.name);
  }

  async execute(command: GetChartsCommand): Promise<GetChartsResponseDto> {
    const { createdAtGte, createdAtLte, reportType, environmentId, organizationId } = command;

    const endDate = createdAtLte ? new Date(createdAtLte) : new Date();
    const startDate = createdAtGte ? new Date(createdAtGte) : subDays(new Date(), 30);
    const data: Record<ReportTypeEnum, ChartDataPointDto[] | WorkflowVolumeDataPointDto[]> = {} as Record<
      ReportTypeEnum,
      ChartDataPointDto[] | WorkflowVolumeDataPointDto[]
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

    return {
      data,
    };
  }
}
