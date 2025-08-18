import { useOrganization } from '@clerk/clerk-react';
import { EnvironmentTypeEnum } from '@novu/shared';
import { CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { ActiveSubscribersTrendChart } from '../components/analytics/charts/active-subscribers-trend-chart';
import { ProvidersByVolume } from '../components/analytics/charts/providers-by-volume';
import { WorkflowRunsTrendChart } from '../components/analytics/charts/workflow-runs-trend-chart';
import { DashboardLayout } from '../components/dashboard-layout';
import { PageMeta } from '../components/page-meta';
import { Badge } from '../components/primitives/badge';
import { FacetedFormFilter } from '../components/primitives/form/faceted-filter/facated-form-filter';
import { InlineToast } from '../components/primitives/inline-toast';
import { useEnvironment } from '../context/environment/hooks';
import { useFetchCharts } from '../hooks/use-fetch-charts';
import { useFetchSubscription } from '../hooks/use-fetch-subscription';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

export function AnalyticsPage() {
  const telemetry = useTelemetry();
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();
  const [searchParams] = useSearchParams();

  const isDevMockMode = searchParams.get('dev_mock_date') === 'true';

  const { selectedDateRange, setSelectedDateRange, dateFilterOptions, chartsDateRange } = useAnalyticsDateFilter({
    organization,
    subscription,
    upgradeCtaIcon: AnalyticsUpgradeCtaIcon,
  });

  // Define report types for each section
  const metricsReportTypes = [
    ReportTypeEnum.MESSAGES_DELIVERED,
    ReportTypeEnum.ACTIVE_SUBSCRIBERS,
    ReportTypeEnum.AVG_MESSAGES_PER_SUBSCRIBER,
    ReportTypeEnum.TOTAL_INTERACTIONS,
  ];

  const chartsReportTypes = [
    ReportTypeEnum.DELIVERY_TREND,
    ReportTypeEnum.INTERACTION_TREND,
    ReportTypeEnum.WORKFLOW_BY_VOLUME,
    ReportTypeEnum.PROVIDER_BY_VOLUME,
    ReportTypeEnum.WORKFLOW_RUNS_TREND,
    ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND,
  ];

  const { charts: metricsCharts, isLoading: isMetricsLoading } = useFetchCharts({
    reportType: metricsReportTypes,
    createdAtGte: chartsDateRange.createdAtGte,
    enabled: true,
    refetchInterval: CHART_CONFIG.refetchInterval,
    staleTime: CHART_CONFIG.staleTime,
    useMockData: isDevMockMode,
  });

  const {
    charts: chartsData,
    isLoading: isChartsLoading,
    error: chartsError,
  } = useFetchCharts({
    reportType: chartsReportTypes,
    createdAtGte: chartsDateRange.createdAtGte,
    enabled: true,
    refetchInterval: CHART_CONFIG.refetchInterval,
    staleTime: CHART_CONFIG.staleTime,
    useMockData: isDevMockMode,
  });

  const { messagesDeliveredData, activeSubscribersData, avgMessagesPerSubscriberData, totalInteractionsData } =
    useMetricData(metricsCharts);

  useEffect(() => {
    telemetry(TelemetryEvent.ANALYTICS_PAGE_VISIT);
  }, [telemetry]);

  return (
    <>
      <PageMeta title="Analytics" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            <span>Analytics</span>
            <Badge variant="lighter" className="text-xs">
              BETA
            </Badge>
            {isDevMockMode && (
              <Badge variant="filled" color="orange" className="text-xs">
                DEV MOCK DATA
              </Badge>
            )}
          </h1>
        }
      >
        <motion.div className="flex flex-col gap-2" variants={ANIMATION_VARIANTS.page} initial="hidden" animate="show">
          <motion.div variants={ANIMATION_VARIANTS.section} className="flex justify-start">
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
          </motion.div>

          <div className="flex flex-col gap-2">
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
              <ChartsSection charts={chartsData} isLoading={isChartsLoading} error={chartsError} />
            </motion.div>

            <motion.div variants={ANIMATION_VARIANTS.section}>
              <WorkflowRunsTrendChart
                data={chartsData?.[ReportTypeEnum.WORKFLOW_RUNS_TREND] as WorkflowRunsTrendDataPoint[]}
                isLoading={isChartsLoading}
                error={chartsError}
              />
            </motion.div>

            <motion.div variants={ANIMATION_VARIANTS.section} className="grid grid-cols-1 lg:grid-cols-12 gap-2">
              <div className="lg:col-span-8">
                <ActiveSubscribersTrendChart
                  data={chartsData?.[ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND] as ActiveSubscribersTrendDataPoint[]}
                  isLoading={isChartsLoading}
                  error={chartsError}
                />
              </div>
              <div className="lg:col-span-4 h-full">
                <ProvidersByVolume
                  data={chartsData?.[ReportTypeEnum.PROVIDER_BY_VOLUME] as ProviderVolumeDataPoint[]}
                  isLoading={isChartsLoading}
                  error={chartsError}
                />
              </div>
            </motion.div>
          </div>
          {currentEnvironment?.type === EnvironmentTypeEnum.DEV && (
            <InlineToast
              title="You're viewing analytics for the Development environment"
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
