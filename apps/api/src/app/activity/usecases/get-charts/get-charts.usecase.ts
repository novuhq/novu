import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';
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
  WorkflowRunsMetricDataPointDto,
  WorkflowRunsTrendDataPointDto,
  WorkflowVolumeDataPointDto,
} from '../../dtos/get-charts.response.dto';
import { ReportTypeEnum } from '../../dtos/shared.dto';
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
    private buildWorkflowRunsMetricChart: BuildWorkflowRunsMetricChart,
    private buildTotalInteractionsChart: BuildTotalInteractionsChart,
    private buildWorkflowRunsTrendChart: BuildWorkflowRunsTrendChart,
    private organizationRepository: CommunityOrganizationRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(GetCharts.name);
  }

  async execute(command: GetChartsCommand): Promise<GetChartsResponseDto> {
    const { createdAtGte, createdAtLte, reportType, environmentId, organizationId } = command;

    const validatedDates = await this.validateRetentionLimitForTier(organizationId, createdAtGte, createdAtLte);

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
      | WorkflowRunsMetricDataPointDto
      | TotalInteractionsDataPointDto
      | WorkflowRunsTrendDataPointDto[]
      | ActiveSubscribersTrendDataPointDto[]
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

    if (reportType.includes(ReportTypeEnum.INTERACTION_TREND)) {
      data[ReportTypeEnum.INTERACTION_TREND] = await this.buildInteractionTrendChart.execute(
        BuildInteractionTrendChartCommand.create({
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

    if (reportType.includes(ReportTypeEnum.PROVIDER_BY_VOLUME)) {
      data[ReportTypeEnum.PROVIDER_BY_VOLUME] = await this.buildProviderByVolumeChart.execute(
        BuildProviderByVolumeChartCommand.create({
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

    if (reportType.includes(ReportTypeEnum.ACTIVE_SUBSCRIBERS)) {
      data[ReportTypeEnum.ACTIVE_SUBSCRIBERS] = await this.buildActiveSubscribersChart.execute(
        Object.assign(new BuildActiveSubscribersChartCommand(), {
          environmentId,
          organizationId,
          startDate,
          endDate,
        })
      );
    }

    if (reportType.includes(ReportTypeEnum.AVG_MESSAGES_PER_SUBSCRIBER)) {
      data[ReportTypeEnum.AVG_MESSAGES_PER_SUBSCRIBER] = await this.buildAvgMessagesPerSubscriberChart.execute(
        Object.assign(new BuildAvgMessagesPerSubscriberChartCommand(), {
          environmentId,
          organizationId,
          startDate,
          endDate,
        })
      );
    }

    if (reportType.includes(ReportTypeEnum.WORKFLOW_RUNS_METRIC)) {
      data[ReportTypeEnum.WORKFLOW_RUNS_METRIC] = await this.buildWorkflowRunsMetricChart.execute(
        Object.assign(new BuildWorkflowRunsMetricChartCommand(), {
          environmentId,
          organizationId,
          startDate,
          endDate,
        })
      );
    }

    if (reportType.includes(ReportTypeEnum.TOTAL_INTERACTIONS)) {
      data[ReportTypeEnum.TOTAL_INTERACTIONS] = await this.buildTotalInteractionsChart.execute(
        Object.assign(new BuildTotalInteractionsChartCommand(), {
          environmentId,
          organizationId,
          startDate,
          endDate,
        })
      );
    }

    if (reportType.includes(ReportTypeEnum.WORKFLOW_RUNS_TREND)) {
      data[ReportTypeEnum.WORKFLOW_RUNS_TREND] = await this.buildWorkflowRunsTrendChart.execute(
        BuildWorkflowRunsTrendChartCommand.create({
          environmentId,
          organizationId,
          startDate,
          endDate,
        })
      );
    }

    if (reportType.includes(ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND)) {
      data[ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND] = await this.buildActiveSubscribersTrendChart.execute(
        BuildActiveSubscribersTrendChartCommand.create({
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

  private async validateRetentionLimitForTier(organizationId: string, createdAtGte?: string, createdAtLte?: string) {
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new HttpException('Organization not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const maxRetentionMs = this.getMaxRetentionPeriodByOrganization(organization);

    const earliestAllowedDate = new Date(Date.now() - maxRetentionMs);

    // If no start date is provided, default to the earliest allowed date
    const effectiveStartDate = createdAtGte ? new Date(createdAtGte) : earliestAllowedDate;
    const effectiveEndDate = createdAtLte ? new Date(createdAtLte) : new Date();

    this.validateDateRange(earliestAllowedDate, effectiveStartDate, effectiveEndDate);

    return {
      after: effectiveStartDate.toISOString(),
      before: effectiveEndDate.toISOString(),
    };
  }

  private validateDateRange(earliestAllowedDate: Date, startDate: Date, endDate: Date) {
    if (startDate > endDate) {
      throw new HttpException(
        'Invalid date range: start date (createdAtGte) must be earlier than end date (createdAtLte)',
        HttpStatus.BAD_REQUEST
      );
    }

    // add buffer to account for time delay in execution
    const buffer = 1 * 60 * 60 * 1000; // 1 hour
    const bufferedEarliestAllowedDate = new Date(earliestAllowedDate.getTime() - buffer);

    if (startDate < bufferedEarliestAllowedDate || endDate < bufferedEarliestAllowedDate) {
      throw new HttpException(
        `Requested date range exceeds your plan's retention period. ` +
          `The earliest accessible date for your plan is ${earliestAllowedDate.toISOString().split('T')[0]}. ` +
          `Please upgrade your plan to access older activities.`,
        HttpStatus.PAYMENT_REQUIRED
      );
    }
  }

  /**
   * Charts data follows the same retention policy as activity feed notifications.
   * Data is automatically deleted after a certain period of time based on the organization's tier.
   */
  private getMaxRetentionPeriodByOrganization(organization: OrganizationEntity) {
    // 1. Self-hosted gets unlimited retention both community and enterprise
    if (process.env.IS_SELF_HOSTED === 'true') {
      return Number.MAX_SAFE_INTEGER;
    }

    const { apiServiceLevel, createdAt } = organization;

    // 2. Special case: Free tier orgs created before Feb 28, 2025 get 30 days
    if (apiServiceLevel === ApiServiceLevelEnum.FREE && new Date(createdAt) < new Date('2025-02-28')) {
      return 30 * 24 * 60 * 60 * 1000;
    }

    // 3. Otherwise, use tier-based retention from feature flags
    return getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
      apiServiceLevel ?? ApiServiceLevelEnum.FREE,
      true
    );
  }
}
