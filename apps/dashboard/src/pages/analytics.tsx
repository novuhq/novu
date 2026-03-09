import { useOrganization } from '@clerk/clerk-react';
import { EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { CalendarIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type ActiveSubscribersTrendDataPoint,
  type ProviderVolumeDataPoint,
  ReportTypeEnum,
  type WorkflowRunsCountDataPoint,
  type WorkflowRunsTrendDataPoint,
} from '../api/activity';
import {
  ANIMATION_VARIANTS,
  AnalyticsSection,
  AnalyticsUpgradeCtaIcon,
  CHART_CONFIG,
  ChartsSection,
  SKELETON_TO_CONTENT_TRANSITION,
  useAnalyticsDateFilter,
  useMetricData,
} from '../components/analytics';
import { AnalyticsPageSkeleton } from '../components/analytics/components/analytics-page-skeleton';
import { ActiveSubscribersTrendChart } from '../components/analytics/charts/active-subscribers-trend-chart';
import { ProvidersByVolume } from '../components/analytics/charts/providers-by-volume';
import { WorkflowRunsTrendChart } from '../components/analytics/charts/workflow-runs-trend-chart';
import { DashboardLayout } from '../components/dashboard-layout';
import { PageMeta } from '../components/page-meta';
import { Badge } from '../components/primitives/badge';
import { FacetedFormFilter } from '../components/primitives/form/faceted-filter/facated-form-filter';
import { InlineToast } from '../components/primitives/inline-toast';
import { useEnvironment } from '../context/environment/hooks';
import { useFeatureFlag } from '../hooks/use-feature-flag';
import { useFetchCharts } from '../hooks/use-fetch-charts';
import { useFetchSubscription } from '../hooks/use-fetch-subscription';
import { useFetchWorkflows } from '../hooks/use-fetch-workflows';
import { useDelayedLoading } from '../hooks/use-delayed-loading';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

export function AnalyticsPage() {
  const telemetry = useTelemetry();
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();
  const [searchParams] = useSearchParams();
  const isWorkflowFilterEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ANALYTICS_WORKFLOW_FILTER_ENABLED);

  const isDevMockMode = searchParams.get('dev_mock_date') === 'true';

  const { selectedDateRange, setSelectedDateRange, dateFilterOptions, chartsDateRange, selectedPeriodLabel } =
    useAnalyticsDateFilter({
      organization,
      subscription,
      upgradeCtaIcon: AnalyticsUpgradeCtaIcon,
    });

  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const { data: workflowTemplates } = useFetchWorkflows({ limit: 100 });

  // Define report types for each section
  // Request 1: Metrics
  const metricsReportTypes = [
    ReportTypeEnum.MESSAGES_DELIVERED,
    ReportTypeEnum.ACTIVE_SUBSCRIBERS,
    ReportTypeEnum.AVG_MESSAGES_PER_SUBSCRIBER,
    ReportTypeEnum.TOTAL_INTERACTIONS,
  ];

  // Request 2: Trends and provider charts
  const trendsReportTypes = [
    ReportTypeEnum.DELIVERY_TREND,
    ReportTypeEnum.INTERACTION_TREND,
    ReportTypeEnum.PROVIDER_BY_VOLUME,
    ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND,
  ];

  // Request 3: Workflow charts
  const workflowReportTypes = [
    ReportTypeEnum.WORKFLOW_BY_VOLUME,
    ReportTypeEnum.WORKFLOW_RUNS_TREND,
    ReportTypeEnum.WORKFLOW_RUNS_COUNT,
  ];

  const { charts: metricsCharts, isLoading: isMetricsLoading } = useFetchCharts({
    reportType: metricsReportTypes,
    createdAtGte: chartsDateRange.createdAtGte,
    workflowIds: selectedWorkflows.length > 0 ? selectedWorkflows : undefined,
    enabled: true,
    refetchInterval: CHART_CONFIG.refetchInterval,
    staleTime: CHART_CONFIG.staleTime,
    useMockData: isDevMockMode,
  });

  const {
    charts: trendsCharts,
    isLoading: isTrendsLoading,
    error: trendsError,
  } = useFetchCharts({
    reportType: trendsReportTypes,
    createdAtGte: chartsDateRange.createdAtGte,
    workflowIds: selectedWorkflows.length > 0 ? selectedWorkflows : undefined,
    enabled: true,
    refetchInterval: CHART_CONFIG.refetchInterval,
    staleTime: CHART_CONFIG.staleTime,
    useMockData: isDevMockMode,
  });

  const {
    charts: workflowCharts,
    isLoading: isWorkflowLoading,
    error: workflowError,
  } = useFetchCharts({
    reportType: workflowReportTypes,
    createdAtGte: chartsDateRange.createdAtGte,
    workflowIds: selectedWorkflows.length > 0 ? selectedWorkflows : undefined,
    enabled: true,
    refetchInterval: CHART_CONFIG.refetchInterval,
    staleTime: CHART_CONFIG.staleTime,
    useMockData: isDevMockMode,
  });

  const chartsData = { ...trendsCharts, ...workflowCharts };

  const { messagesDeliveredData, activeSubscribersData, avgMessagesPerSubscriberData, totalInteractionsData } =
    useMetricData(metricsCharts);

  const isPageLoading = isMetricsLoading || isTrendsLoading || isWorkflowLoading;
  const showSkeleton = useDelayedLoading(isPageLoading, 400);

  useEffect(() => {
    telemetry(TelemetryEvent.ANALYTICS_PAGE_VISIT);
  }, [telemetry]);

  return (
    <>
      <PageMeta title="Usage" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            <span>Usage</span>
            {isDevMockMode && (
              <Badge variant="filled" color="orange" className="text-xs">
                DEV MOCK DATA
              </Badge>
            )}
          </h1>
        }
      >
        <motion.div className="flex flex-col gap-1.5" variants={ANIMATION_VARIANTS.page} initial="hidden" animate="show">
          <motion.div variants={ANIMATION_VARIANTS.section} className="flex justify-start gap-2">
            <FacetedFormFilter
              size="small"
              type="single"
              hideClear
              hideSearch
              hideTitle
              title="Time period"
              options={dateFilterOptions}
              selected={[selectedDateRange]}
              onSelect={(values) => setSelectedDateRange(values[0])}
              icon={CalendarIcon}
            />
            {isWorkflowFilterEnabled && (
              <FacetedFormFilter
                size="small"
                type="multi"
                title="Workflows"
                options={
                  workflowTemplates?.workflows?.map((workflow) => ({
                    label: workflow.name,
                    value: workflow._id,
                  })) || []
                }
                selected={selectedWorkflows}
                onSelect={(values) => setSelectedWorkflows(values)}
              />
            )}
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            {showSkeleton ? (
              <motion.div
                key="skeleton"
                className="flex flex-col gap-1.5"
                initial={false}
                exit={SKELETON_TO_CONTENT_TRANSITION.skeletonExit}
              >
                <AnalyticsPageSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                className="flex flex-col gap-1.5"
                initial="hidden"
                animate="show"
                variants={SKELETON_TO_CONTENT_TRANSITION.contentEnter}
              >
                <motion.div variants={SKELETON_TO_CONTENT_TRANSITION.contentSection}>
                  <AnalyticsSection
                    messagesDeliveredData={messagesDeliveredData}
                    activeSubscribersData={activeSubscribersData}
                    avgMessagesPerSubscriberData={avgMessagesPerSubscriberData}
                    totalInteractionsData={totalInteractionsData}
                    isLoading={isMetricsLoading}
                  />
                </motion.div>

                <motion.div variants={SKELETON_TO_CONTENT_TRANSITION.contentSection}>
                  <ChartsSection
                    charts={chartsData}
                    isTrendsLoading={isTrendsLoading}
                    isWorkflowLoading={isWorkflowLoading}
                    trendsError={trendsError}
                    workflowError={workflowError}
                  />
                </motion.div>

                <motion.div variants={SKELETON_TO_CONTENT_TRANSITION.contentSection}>
                  <WorkflowRunsTrendChart
                    data={chartsData?.[ReportTypeEnum.WORKFLOW_RUNS_TREND] as WorkflowRunsTrendDataPoint[]}
                    count={(chartsData?.[ReportTypeEnum.WORKFLOW_RUNS_COUNT] as WorkflowRunsCountDataPoint | undefined)?.count}
                    periodLabel={selectedPeriodLabel}
                    isLoading={isWorkflowLoading}
                    error={workflowError}
                  />
                </motion.div>

                <motion.div
                  variants={SKELETON_TO_CONTENT_TRANSITION.contentSection}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 items-stretch lg:h-[200px]"
                >
                  <div className="lg:col-span-8 h-full min-h-0">
                    <ActiveSubscribersTrendChart
                      data={chartsData?.[ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND] as ActiveSubscribersTrendDataPoint[]}
                      isLoading={isTrendsLoading}
                      error={trendsError}
                    />
                  </div>
                  <div className="lg:col-span-4 h-full min-h-0">
                    <ProvidersByVolume
                      data={chartsData?.[ReportTypeEnum.PROVIDER_BY_VOLUME] as ProviderVolumeDataPoint[]}
                      isLoading={isTrendsLoading}
                      error={trendsError}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {currentEnvironment?.type === EnvironmentTypeEnum.DEV && !showSkeleton && (
            <InlineToast
              title="You're viewing usage for the Development environment"
              variant="tip"
              ctaLabel="Switch to production"
              onCtaClick={() => {
                if (oppositeEnvironment?.slug) {
                  switchEnvironment(oppositeEnvironment.slug);
                }
              }}
            />
          )}
        </motion.div>
      </DashboardLayout>
    </>
  );
}
