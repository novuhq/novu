import { useOrganization } from '@clerk/react';
import { CopilotPageEnum, EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  type ActiveSubscribersTrendDataPoint,
  type ProviderVolumeDataPoint,
  ReportTypeEnum,
  type WorkflowRunsTrendDataPoint,
} from '../api/activity';
import {
  ANIMATION_VARIANTS,
  AnalyticsSection,
  AnalyticsUpgradeCtaIcon,
  CHART_CONFIG,
  ChartsSection,
  useAnalyticsDateFilter,
  useMetricData,
} from '../components/analytics';
import { buildUsagePageView } from '../components/analytics/analytics-copilot';
import { ActiveSubscribersTrendChart } from '../components/analytics/charts/active-subscribers-trend-chart';
import { ProvidersByVolume } from '../components/analytics/charts/providers-by-volume';
import { WorkflowRunsTrendChart } from '../components/analytics/charts/workflow-runs-trend-chart';
import {
  isWorkflowFilterCarriedOver,
  readAnalyticsUrlFilters,
  type WorkflowFilterOrigin,
  withAnalyticsUrlFilters,
  workflowFilterOptions,
} from '../components/analytics/utils/analytics-url-filters';
import type { ComparePlansLocationState } from '../components/billing/plan';
import { UsageTierSuggestionBanner } from '../components/billing/usage-limits/usage-tier-suggestion-banner';
import { useRegisterCopilotPageView } from '../components/copilot-web-chat/copilot-page-view-store';
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
import { useTelemetry } from '../hooks/use-telemetry';
import { ROUTES } from '../utils/routes';
import { TelemetryEvent } from '../utils/telemetry';

export function AnalyticsPage() {
  const telemetry = useTelemetry();
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();
  const [searchParams, setSearchParams] = useSearchParams();
  const { environmentSlug } = useParams<{ environmentSlug: string }>();
  const navigate = useNavigate();
  const isWorkflowFilterEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ANALYTICS_WORKFLOW_FILTER_ENABLED);

  const isDevMockMode = searchParams.get('dev_mock_date') === 'true';
  // react-router keeps `searchParams` the same object until the query string changes.
  const urlFilters = useMemo(() => readAnalyticsUrlFilters(searchParams), [searchParams]);

  const { selectedDateRange, dateFilterOptions, chartsDateRange, selectedPeriodLabel } = useAnalyticsDateFilter({
    organization,
    subscription,
    upgradeCtaIcon: AnalyticsUpgradeCtaIcon,
    preferredDateRange: urlFilters.period,
  });

  // Without the workflow filter on, a `workflows` param from a shared link is ignored, as the page shows no filter.
  const selectedWorkflows = useMemo(
    () => (isWorkflowFilterEnabled ? urlFilters.workflowIds : []),
    [isWorkflowFilterEnabled, urlFilters]
  );
  const { data: workflowTemplates } = useFetchWorkflows({ limit: 100 });

  const updateUrlFilters = useCallback(
    (filters: { period?: string; workflowIds?: string[] }) => {
      setSearchParams(
        (current) => {
          const currentFilters = readAnalyticsUrlFilters(current);

          return withAnalyticsUrlFilters(current, {
            period: filters.period ?? currentFilters.period,
            workflowIds: filters.workflowIds ?? currentFilters.workflowIds,
          });
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // An environment switch keeps the query string and this page mounted. The slug and the filter come from one
  // location, so a switch and a link to another environment's Usage page are told apart in the same render.
  const filterOriginRef = useRef<WorkflowFilterOrigin>({ environmentSlug, workflowIds: urlFilters.workflowIds });
  useEffect(() => {
    const origin = { environmentSlug, workflowIds: urlFilters.workflowIds };
    const previousOrigin = filterOriginRef.current;
    filterOriginRef.current = origin;
    if (isWorkflowFilterCarriedOver(previousOrigin, origin)) updateUrlFilters({ workflowIds: [] });
  }, [environmentSlug, urlFilters.workflowIds, updateUrlFilters]);

  useRegisterCopilotPageView(
    CopilotPageEnum.USAGE,
    buildUsagePageView({ period: selectedDateRange, workflowIds: selectedWorkflows })
  );

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
  const workflowReportTypes = [ReportTypeEnum.WORKFLOW_BY_VOLUME, ReportTypeEnum.WORKFLOW_RUNS_TREND];

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

  const chartsData = useMemo(() => ({ ...trendsCharts, ...workflowCharts }), [trendsCharts, workflowCharts]);

  const { messagesDeliveredData, activeSubscribersData, avgMessagesPerSubscriberData, totalInteractionsData } =
    useMetricData(metricsCharts);

  const workflowRunsCount = useMemo(() => {
    const trend = workflowCharts?.[ReportTypeEnum.WORKFLOW_RUNS_TREND] as WorkflowRunsTrendDataPoint[] | undefined;
    if (!trend) return undefined;

    return trend.reduce((sum, day) => sum + day.completed + day.error, 0);
  }, [workflowCharts]);

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
        <motion.div
          className="flex flex-col gap-1.5"
          variants={ANIMATION_VARIANTS.page}
          initial="hidden"
          animate="show"
        >
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
              onSelect={(values) => updateUrlFilters({ period: values[0] })}
              icon={CalendarIcon}
            />
            {isWorkflowFilterEnabled && (
              <FacetedFormFilter
                size="small"
                type="multi"
                title="Workflows"
                options={workflowFilterOptions(workflowTemplates?.workflows, selectedWorkflows)}
                selected={selectedWorkflows}
                onSelect={(values) => updateUrlFilters({ workflowIds: values })}
              />
            )}
          </motion.div>

          <motion.div variants={ANIMATION_VARIANTS.section} className="mb-1.5 mt-2.5 empty:hidden">
            <UsageTierSuggestionBanner
              source="usage_page_tier_suggestion"
              onComparePlans={() =>
                navigate(ROUTES.SETTINGS_BILLING, {
                  state: { scrollToComparePlans: true } satisfies ComparePlansLocationState,
                })
              }
            />
          </motion.div>

          <motion.div variants={ANIMATION_VARIANTS.section}>
            <AnalyticsSection
              messagesDeliveredData={messagesDeliveredData}
              activeSubscribersData={activeSubscribersData}
              avgMessagesPerSubscriberData={avgMessagesPerSubscriberData}
              totalInteractionsData={totalInteractionsData}
              isLoading={isMetricsLoading}
            />
          </motion.div>

          <motion.div variants={ANIMATION_VARIANTS.section}>
            <ChartsSection
              charts={chartsData}
              isTrendsLoading={isTrendsLoading}
              isWorkflowLoading={isWorkflowLoading}
              trendsError={trendsError}
              workflowError={workflowError}
            />
          </motion.div>

          <motion.div variants={ANIMATION_VARIANTS.section}>
            <WorkflowRunsTrendChart
              data={chartsData?.[ReportTypeEnum.WORKFLOW_RUNS_TREND] as WorkflowRunsTrendDataPoint[]}
              count={workflowRunsCount}
              periodLabel={selectedPeriodLabel}
              isLoading={isWorkflowLoading}
              error={workflowError}
            />
          </motion.div>

          <motion.div
            variants={ANIMATION_VARIANTS.section}
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

          {currentEnvironment?.type === EnvironmentTypeEnum.DEV && (
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
