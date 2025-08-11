import { motion } from 'motion/react';
import { ReactElement, useEffect } from 'react';
import { ReportTypeEnum } from '../api/activity';
import { DashboardLayout } from '../components/dashboard-layout';
import {
  ANIMATION_VARIANTS,
  CHART_CONFIG,
  ResourcesSection,
  TopLevelStats,
  useMetricData,
  WelcomeHeader,
} from '../components/home-page';
import { PageMeta } from '../components/page-meta';
import { Separator } from '../components/primitives/separator';
import { useFetchCharts } from '../hooks/use-fetch-charts';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

export function HomePage(): ReactElement {
  const telemetry = useTelemetry();

  // Hardcoded 30-day period for home page
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { charts, isLoading: isChartsLoading } = useFetchCharts({
    reportType: CHART_CONFIG.reportTypes.map((type) => ReportTypeEnum[type]),
    createdAtGte: thirtyDaysAgo,
    enabled: true,
    refetchInterval: CHART_CONFIG.refetchInterval,
    staleTime: CHART_CONFIG.staleTime,
  });

  const { workflowRunsMetricData } = useMetricData(charts);

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
              periodLabel="Last 30 days"
            />
          </motion.div>

          <Separator />

          <motion.div variants={ANIMATION_VARIANTS.section}>
            <ResourcesSection />
          </motion.div>
        </motion.div>
      </DashboardLayout>
    </>
  );
}
