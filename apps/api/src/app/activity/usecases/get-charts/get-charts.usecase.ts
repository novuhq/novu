import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  ActiveSubscribersDataPointDto,
  ActiveSubscribersTrendDataPointDto,
  AvgMessagesPerSubscriberDataPointDto,
  ChartDataPointDto,
  GetChartsResponseDto,
  InteractionTrendDataPointDto,
  MessagesDeliveredDataPointDto,
  ProviderVolumeDataPointDto,
  TotalInteractionsDataPointDto,
  WorkflowRunsCountDataPointDto,
  WorkflowRunsMetricDataPointDto,
  WorkflowRunsTrendDataPointDto,
  WorkflowVolumeDataPointDto,
} from '../../dtos/get-charts.response.dto';
import { ReportTypeEnum } from '../../dtos/shared.dto';
import { ActivityRetentionService } from '../../shared/activity-retention.service';
import { BuildActiveSubscribersChart, BuildActiveSubscribersChartCommand } from '../build-active-subscribers-chart';
import { BuildActiveSubscribersTrendChartCommand } from '../build-active-subscribers-trend-chart/build-active-subscribers-trend-chart.command';
import { BuildActiveSubscribersTrendChart } from '../build-active-subscribers-trend-chart/build-active-subscribers-trend-chart.usecase';
import {
  BuildAvgMessagesPerSubscriberChart,
  BuildAvgMessagesPerSubscriberChartCommand,
} from '../build-avg-messages-per-subscriber-chart';
import { BuildDeliveryTrendChart, BuildDeliveryTrendChartCommand } from '../build-delivery-trend-chart';
import { BuildInteractionTrendChart, BuildInteractionTrendChartCommand } from '../build-interaction-trend-chart';
import { BuildMessagesDeliveredChart, BuildMessagesDeliveredChartCommand } from '../build-messages-delivered-chart';
import { BuildProviderByVolumeChart, BuildProviderByVolumeChartCommand } from '../build-provider-by-volume-chart';
import { BuildTotalInteractionsChart, BuildTotalInteractionsChartCommand } from '../build-total-interactions-chart';
import { BuildWorkflowByVolumeChart, BuildWorkflowByVolumeChartCommand } from '../build-workflow-by-volume-chart';
import { BuildWorkflowRunsCountChart, BuildWorkflowRunsCountChartCommand } from '../build-workflow-runs-count-chart';
import { BuildWorkflowRunsMetricChart, BuildWorkflowRunsMetricChartCommand } from '../build-workflow-runs-metric-chart';
import { BuildWorkflowRunsTrendChart, BuildWorkflowRunsTrendChartCommand } from '../build-workflow-runs-trend-chart';
import { GetChartsCommand } from './get-charts.command';

@Injectable()
export class GetCharts {
  constructor(
    private buildDeliveryTrendChart: BuildDeliveryTrendChart,
    private buildInteractionTrendChart: BuildInteractionTrendChart,
    private buildWorkflowByVolumeChart: BuildWorkflowByVolumeChart,
    private buildProviderByVolumeChart: BuildProviderByVolumeChart,
    private buildMessagesDeliveredChart: BuildMessagesDeliveredChart,
    private buildActiveSubscribersChart: BuildActiveSubscribersChart,
    private buildActiveSubscribersTrendChart: BuildActiveSubscribersTrendChart,
    private buildAvgMessagesPerSubscriberChart: BuildAvgMessagesPerSubscriberChart,
    private buildWorkflowRunsCountChart: BuildWorkflowRunsCountChart,
    private buildWorkflowRunsMetricChart: BuildWorkflowRunsMetricChart,
    private buildTotalInteractionsChart: BuildTotalInteractionsChart,
    private buildWorkflowRunsTrendChart: BuildWorkflowRunsTrendChart,
    private activityRetentionService: ActivityRetentionService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(GetCharts.name);
  }

  async execute(command: GetChartsCommand): Promise<GetChartsResponseDto> {
    const {
      createdAtGte,
      createdAtLte,
      reportType,
      environmentId,
      organizationId,
      workflowIds,
      subscriberIds,
      transactionIds,
      statuses,
      channels,
      topicKey,
    } = command;

    const validatedDates = await this.activityRetentionService.validateRetentionLimitForTier(
      organizationId,
      createdAtGte,
      createdAtLte
    );

    const endDate = new Date(validatedDates.before);
    const startDate = new Date(validatedDates.after);
    const data: Record<
      ReportTypeEnum,
      | ChartDataPointDto[]
      | InteractionTrendDataPointDto[]
      | WorkflowVolumeDataPointDto[]
      | ProviderVolumeDataPointDto[]
      | MessagesDeliveredDataPointDto
      | ActiveSubscribersDataPointDto
      | AvgMessagesPerSubscriberDataPointDto
      | WorkflowRunsCountDataPointDto
      | WorkflowRunsMetricDataPointDto
      | TotalInteractionsDataPointDto
      | WorkflowRunsTrendDataPointDto[]
      | ActiveSubscribersTrendDataPointDto[]
    > = {} as Record<
      ReportTypeEnum,
      | ChartDataPointDto[]
      | InteractionTrendDataPointDto[]
      | WorkflowVolumeDataPointDto[]
      | ProviderVolumeDataPointDto[]
      | MessagesDeliveredDataPointDto
      | ActiveSubscribersDataPointDto
      | AvgMessagesPerSubscriberDataPointDto
      | WorkflowRunsCountDataPointDto
      | WorkflowRunsMetricDataPointDto
      | TotalInteractionsDataPointDto
      | WorkflowRunsTrendDataPointDto[]
      | ActiveSubscribersTrendDataPointDto[]
    >;

    const chartPromises: Array<{
      type: ReportTypeEnum;
      promise: Promise<
        | ChartDataPointDto[]
        | InteractionTrendDataPointDto[]
        | WorkflowVolumeDataPointDto[]
        | ProviderVolumeDataPointDto[]
        | MessagesDeliveredDataPointDto
        | ActiveSubscribersDataPointDto
        | AvgMessagesPerSubscriberDataPointDto
        | WorkflowRunsCountDataPointDto
        | WorkflowRunsMetricDataPointDto
        | TotalInteractionsDataPointDto
        | WorkflowRunsTrendDataPointDto[]
        | ActiveSubscribersTrendDataPointDto[]
      >;
    }> = [];

    if (reportType.includes(ReportTypeEnum.DELIVERY_TREND)) {
      chartPromises.push({
        type: ReportTypeEnum.DELIVERY_TREND,
        promise: this.buildDeliveryTrendChart.execute(
          BuildDeliveryTrendChartCommand.create({
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.INTERACTION_TREND)) {
      chartPromises.push({
        type: ReportTypeEnum.INTERACTION_TREND,
        promise: this.buildInteractionTrendChart.execute(
          BuildInteractionTrendChartCommand.create({
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.WORKFLOW_BY_VOLUME)) {
      chartPromises.push({
        type: ReportTypeEnum.WORKFLOW_BY_VOLUME,
        promise: this.buildWorkflowByVolumeChart.execute(
          BuildWorkflowByVolumeChartCommand.create({
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.PROVIDER_BY_VOLUME)) {
      chartPromises.push({
        type: ReportTypeEnum.PROVIDER_BY_VOLUME,
        promise: this.buildProviderByVolumeChart.execute(
          BuildProviderByVolumeChartCommand.create({
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.MESSAGES_DELIVERED)) {
      chartPromises.push({
        type: ReportTypeEnum.MESSAGES_DELIVERED,
        promise: this.buildMessagesDeliveredChart.execute(
          Object.assign(new BuildMessagesDeliveredChartCommand(), {
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.ACTIVE_SUBSCRIBERS)) {
      chartPromises.push({
        type: ReportTypeEnum.ACTIVE_SUBSCRIBERS,
        promise: this.buildActiveSubscribersChart.execute(
          Object.assign(new BuildActiveSubscribersChartCommand(), {
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.AVG_MESSAGES_PER_SUBSCRIBER)) {
      chartPromises.push({
        type: ReportTypeEnum.AVG_MESSAGES_PER_SUBSCRIBER,
        promise: this.buildAvgMessagesPerSubscriberChart.execute(
          Object.assign(new BuildAvgMessagesPerSubscriberChartCommand(), {
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.WORKFLOW_RUNS_METRIC)) {
      chartPromises.push({
        type: ReportTypeEnum.WORKFLOW_RUNS_METRIC,
        promise: this.buildWorkflowRunsMetricChart.execute(
          Object.assign(new BuildWorkflowRunsMetricChartCommand(), {
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.WORKFLOW_RUNS_COUNT)) {
      chartPromises.push({
        type: ReportTypeEnum.WORKFLOW_RUNS_COUNT,
        promise: this.buildWorkflowRunsCountChart.execute(
          Object.assign(new BuildWorkflowRunsCountChartCommand(), {
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
            subscriberIds,
            transactionIds,
            statuses,
            channels,
            topicKey,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.TOTAL_INTERACTIONS)) {
      chartPromises.push({
        type: ReportTypeEnum.TOTAL_INTERACTIONS,
        promise: this.buildTotalInteractionsChart.execute(
          Object.assign(new BuildTotalInteractionsChartCommand(), {
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.WORKFLOW_RUNS_TREND)) {
      chartPromises.push({
        type: ReportTypeEnum.WORKFLOW_RUNS_TREND,
        promise: this.buildWorkflowRunsTrendChart.execute(
          BuildWorkflowRunsTrendChartCommand.create({
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    if (reportType.includes(ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND)) {
      chartPromises.push({
        type: ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND,
        promise: this.buildActiveSubscribersTrendChart.execute(
          BuildActiveSubscribersTrendChartCommand.create({
            environmentId,
            organizationId,
            startDate,
            endDate,
            workflowIds,
          })
        ),
      });
    }

    const results = await Promise.all(chartPromises.map(({ promise }) => promise));

    chartPromises.forEach(({ type }, index) => {
      data[type] = results[index];
    });

    return {
      data,
    };
  }
}
