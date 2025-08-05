import { motion } from 'motion/react';
import { ReactElement, useEffect } from 'react';
import { RiBookletFill, RiBookmark2Fill, RiCopperCoinLine, RiGroup2Fill } from 'react-icons/ri';
import { DashboardLayout } from '../components/dashboard-layout';
import { DeliveryTrendsChart } from '../components/delivery-trends-chart';
import { InboxBellFilled } from '../components/icons/inbox-bell-filled';
import { StackedDots } from '../components/icons/stacked-dots';
import { TargetArrow } from '../components/icons/target-arrow';
import { TrendLineUp } from '../components/icons/trend-line-up';
import { InteractionTrendChart } from '../components/interaction-trend-chart';
import { PageMeta } from '../components/page-meta';
import { AnalyticsCard } from '../components/primitives/analytics-card';
import { ProgressSection } from '../components/welcome/progress-section';
import { Resource, ResourcesList } from '../components/welcome/resources-list';
import { WorkflowsByVolume } from '../components/workflows-by-volume';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

const welcomeMessages = [
  'Good to have you back 👋',
  'Welcome back, superstar! ⭐',
  'Hey there! 🚀',
  'Great to see you again! 🎉',
  'Hello, notification ninja! 🥷',
  'Welcome back, creator! ✨',
  "Look who's back! 🌟",
  'Ready to make some magic happen? 🪄',
  'The notification master returns! 🎯',
  'Welcome aboard, captain! ⚓',
  'Back in action, legend! 💪',
  'Your dashboard awaits, chief! 👑',
  'Let the notifications flow! 🌊',
  'Welcome to your command center! 🎛️',
  'Ready to rock and roll? 🎸',
];

const subtitle = "Everything's wired up so your subscribers get the right update, right on time.";

function WelcomeHeader() {
  const randomGreeting = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

  return (
    <div className="flex flex-col gap-0.5 items-start justify-center">
      <div className="text-label-xl text-text-strong">
        <p>{randomGreeting}</p>
      </div>
      <div className="flex flex-col items-start justify-start w-full">
        <div className="text-label-md text-text-soft">
          <p>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function TopLevelStats() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1">
        <h2 className="text-text-strong font-medium text-[44px] leading-[52px]">31,718</h2>
        <div className="pb-2">
          <div className="flex items-center gap-0.5 bg-green-100 px-1 h-4 rounded-full text-green-600 text-subheading-2xs uppercase">
            <TrendLineUp />
            <span className="text-subheading-2xs uppercase">5%</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-[#99a0ae]">Workflow runs during 30, Sept 2025 - 01, Oct 2025.</p>
    </div>
  );
}

const helpfulResources: Resource[] = [
  {
    title: 'Documentation',
    image: 'blog.svg',
    url: 'https://docs.novu.co/',
  },
  {
    title: 'Join our community on Discord',
    image: 'discord.svg',
    url: 'https://discord.gg/novu',
  },
  {
    title: 'See our code on GitHub',
    image: 'git.svg',
    url: 'https://github.com/novuhq/novu',
  },
  {
    title: 'Security & Compliance',
    image: 'security.svg',
    url: 'https://trust.novu.co/',
  },
];

const learnResources: Resource[] = [
  {
    title: 'Manage Subscribers',
    duration: '4m read',
    image: 'subscribers.svg',
    url: 'https://docs.novu.co/platform/concepts/subscribers?utm_source=novu.co&utm_medium=welcome-page',
  },
  {
    title: 'Topics',
    duration: '5m read',
    image: 'topics.svg',
    url: 'https://docs.novu.co/platform/concepts/topics?utm_source=novu.co&utm_medium=welcome-page',
  },
  {
    title: 'Code First Workflows',
    duration: '4m read',
    image: 'code-first.svg',
    url: 'https://docs.novu.co/framework/introduction?utm_source=novu.co&utm_medium=welcome-page',
  },
  {
    title: 'Digest Engine',
    duration: '3m read',
    image: 'digest engine-1.svg',
    url: 'https://docs.novu.co/platform/workflow/digest?utm_source=novu.co&utm_medium=welcome-page',
  },
];

export function HomePage(): ReactElement {
  const telemetry = useTelemetry();

  useEffect(() => {
    telemetry(TelemetryEvent.WELCOME_PAGE_VIEWED);
  }, [telemetry]);

  const pageVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <>
      <PageMeta title="Home page" />
      <DashboardLayout>
        <motion.div className="flex flex-col gap-8 p-9 pt-4" variants={pageVariants} initial="hidden" animate="show">
          <motion.div variants={sectionVariants}>
            <WelcomeHeader />
          </motion.div>

          <motion.div variants={sectionVariants}>
            <TopLevelStats />
          </motion.div>

          <motion.div variants={sectionVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <AnalyticsCard
                icon={InboxBellFilled}
                value="34,613,001"
                title="Messages delivered"
                description="+40 compared to prior 30 days"
                percentageChange={3}
                trendDirection="up"
              />

              <AnalyticsCard
                icon={RiGroup2Fill}
                value="1,718,030"
                title="Active subscribers"
                description="+400 compared to prior 30 days"
                percentageChange={3}
                trendDirection="up"
              />

              <AnalyticsCard
                icon={TargetArrow}
                value="78%"
                title="Interaction rate"
                description="+10% compared to prior 30 days"
                percentageChange={3}
                trendDirection="up"
              />

              <AnalyticsCard
                icon={StackedDots}
                value="18"
                title="Avg. Messages per subscriber"
                description="+5 compared to prior 30 days"
                percentageChange={3}
                trendDirection="up"
              />
            </div>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DeliveryTrendsChart />
              <WorkflowsByVolume />
              <InteractionTrendChart />
            </div>
          </motion.div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6">
              <motion.div variants={sectionVariants}>
                <ResourcesList
                  title="Helpful resources"
                  icon={<RiBookmark2Fill className="h-4 w-4" />}
                  resources={helpfulResources}
                />
              </motion.div>

              <motion.div variants={sectionVariants}>
                <ResourcesList title="Learn" icon={<RiBookletFill className="h-4 w-4" />} resources={learnResources} />
              </motion.div>
            </div>

            <ProgressSection isNewHomePageEnabled={true} />
          </div>
        </motion.div>
      </DashboardLayout>
    </>
  );
}
