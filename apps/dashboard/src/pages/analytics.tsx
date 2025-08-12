import { useOrganization } from '@clerk/clerk-react';
import { CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { ReportTypeEnum, type WorkflowRunsTrendDataPoint } from '../api/activity';
import {
  ANIMATION_VARIANTS,
  AnalyticsSection,
  CHART_CONFIG,
  ChartsSection,
  useAnalyticsDateFilter,
  useMetricData,
} from '../components/analytics';
import { WorkflowRunsTrendChart } from '../components/analytics/charts/workflow-runs-trend-chart';
import { DashboardLayout } from '../components/dashboard-layout';
import { PageMeta } from '../components/page-meta';
import { FacetedFormFilter } from '../components/primitives/form/faceted-filter/facated-form-filter';
import { useFetchCharts } from '../hooks/use-fetch-charts';
import { useFetchSubscription } from '../hooks/use-fetch-subscription';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

export function AnalyticsPage() {
  const telemetry = useTelemetry();
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();

  const { selectedDateRange, setSelectedDateRange, dateFilterOptions, chartsDateRange } = useAnalyticsDateFilter({
    organization,
    subscription,
  });

  const {
    charts,
    isLoading: isChartsLoading,
    error: chartsError,
  } = useFetchCharts({
    reportType: CHART_CONFIG.reportTypes.map((type) => ReportTypeEnum[type]),
    createdAtGte: chartsDateRange.createdAtGte,
    enabled: true,
    refetchInterval: CHART_CONFIG.refetchInterval,
    staleTime: CHART_CONFIG.staleTime,
  });

  const { messagesDeliveredData, activeSubscribersData, avgMessagesPerSubscriberData, totalInteractionsData } =
    useMetricData(charts);

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
                isLoading={isChartsLoading}
              />
            </motion.div>

            <motion.div variants={ANIMATION_VARIANTS.section}>
              <ChartsSection charts={charts} isLoading={isChartsLoading} error={chartsError} />
            </motion.div>

            <motion.div variants={ANIMATION_VARIANTS.section}>
              <WorkflowRunsTrendChart
                data={charts?.[ReportTypeEnum.WORKFLOW_RUNS_TREND] as WorkflowRunsTrendDataPoint[]}
                isLoading={isChartsLoading}
                error={chartsError}
              />
            </motion.div>
          </div>
        </motion.div>
      </DashboardLayout>
    </>
  );
}
