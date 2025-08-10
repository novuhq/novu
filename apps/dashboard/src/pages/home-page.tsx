import { useOrganization } from '@clerk/clerk-react';
import { CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { ReactElement, useEffect } from 'react';
import { ReportTypeEnum } from '../api/activity';
import { DashboardLayout } from '../components/dashboard-layout';
import {
  ANIMATION_VARIANTS,
  AnalyticsSection,
  CHART_CONFIG,
  ChartsSection,
  ResourcesSection,
  TopLevelStats,
  UpgradeCtaIcon,
  useHomepageDateFilter,
  useMetricData,
  WelcomeHeader,
} from '../components/home-page';
import { PageMeta } from '../components/page-meta';
import { FacetedFormFilter } from '../components/primitives/form/faceted-filter/facated-form-filter';
import { Separator } from '../components/primitives/separator';
import { useFetchCharts } from '../hooks/use-fetch-charts';
import { useFetchSubscription } from '../hooks/use-fetch-subscription';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

export function HomePage(): ReactElement {
  const telemetry = useTelemetry();
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();

  const { selectedDateRange, setSelectedDateRange, dateFilterOptions, chartsDateRange, selectedPeriodLabel } =
    useHomepageDateFilter({
      organization,
      subscription,
      upgradeCtaIcon: UpgradeCtaIcon,
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

  const { messagesDeliveredData, activeSubscribersData, avgMessagesPerSubscriberData, workflowRunsMetricData } =
    useMetricData(charts);

  useEffect(() => {
    telemetry(TelemetryEvent.WELCOME_PAGE_VIEWED);
  }, [telemetry]);

  return (
    <>
      <PageMeta title="Home page" />
      <DashboardLayout>
        <motion.div
          className="flex flex-col gap-8 p-9 pt-4"
          variants={ANIMATION_VARIANTS.page}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={ANIMATION_VARIANTS.section}>
            <WelcomeHeader />
          </motion.div>

          <motion.div variants={ANIMATION_VARIANTS.section}>
            <TopLevelStats
              value={workflowRunsMetricData.value}
              percentageChange={workflowRunsMetricData.percentageChange}
              trendDirection={workflowRunsMetricData.trendDirection}
              isLoading={isChartsLoading}
              periodLabel={selectedPeriodLabel}
              dateFilter={
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
              }
            />
          </motion.div>

          <div className="flex flex-col gap-2">
            <motion.div variants={ANIMATION_VARIANTS.section}>
              <AnalyticsSection
                messagesDeliveredData={messagesDeliveredData}
                activeSubscribersData={activeSubscribersData}
                avgMessagesPerSubscriberData={avgMessagesPerSubscriberData}
                isLoading={isChartsLoading}
              />
            </motion.div>

            <motion.div variants={ANIMATION_VARIANTS.section}>
              <ChartsSection charts={charts} isLoading={isChartsLoading} error={chartsError} />
            </motion.div>
          </div>

          <Separator />

          <motion.div variants={ANIMATION_VARIANTS.section}>
            <ResourcesSection />
          </motion.div>
        </motion.div>
      </DashboardLayout>
    </>
  );
}
