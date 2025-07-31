import { motion } from 'motion/react';
import { ReactElement, useEffect } from 'react';
import { RiBookletFill, RiBookmark2Fill } from 'react-icons/ri';
import { DashboardLayout } from '../components/dashboard-layout';
import { PageMeta } from '../components/page-meta';
import { ProgressSection } from '../components/welcome/progress-section';
import { Resource, ResourcesList } from '../components/welcome/resources-list';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

function WelcomeHeader() {
  return (
    <div className="flex flex-col gap-0.5 items-start justify-center">
      <div className="flex flex-col font-medium justify-center text-[#0e121b] text-[24px] text-left tracking-[-0.36px]">
        <p className="leading-[32px] whitespace-pre">Good to have you back, John 👋</p>
      </div>
      <div className="flex flex-col items-start justify-start w-full">
        <div className="flex flex-col font-medium justify-center text-[#99a0ae] text-[16px] text-left tracking-[-0.176px] w-full">
          <p className="leading-[24px]">
            Everything's wired up so your subscribers get the right update, right on time.
          </p>
        </div>
      </div>
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
            <ResourcesList
              title="Helpful resources"
              icon={<RiBookmark2Fill className="h-4 w-4" />}
              resources={helpfulResources}
            />
          </motion.div>

          <motion.div variants={sectionVariants}>
            <ResourcesList title="Learn" icon={<RiBookletFill className="h-4 w-4" />} resources={learnResources} />
          </motion.div>
        </motion.div>
      </DashboardLayout>
    </>
  );
}
