import { motion } from 'motion/react';
import { ReactElement, useEffect } from 'react';
import { RiChat3Line, RiNotification3Line } from 'react-icons/ri';
import { DashboardLayout } from '../components/dashboard-layout';
import { PageMeta } from '../components/page-meta';
import { SetupStepsCard } from '../components/welcome/home/setup-steps-card';
import { useWelcomeSetup } from '../components/welcome/home/use-welcome-setup';
import { WelcomeBanner } from '../components/welcome/home/welcome-banner';
import { WelcomeHeading } from '../components/welcome/home/welcome-heading';
import { WelcomeSidebar } from '../components/welcome/home/welcome-sidebar';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export function WelcomePage(): ReactElement {
  const telemetry = useTelemetry();
  const { variant, steps, showWorkflowsBanner, showAgentsBanner, goToWorkflows, goToAgentsSetup, openDocs } =
    useWelcomeSetup();

  useEffect(() => {
    telemetry(TelemetryEvent.WELCOME_PAGE_VIEWED, { variant });
  }, [telemetry, variant]);

  return (
    <>
      <PageMeta title="Get Started with Novu" />
      <DashboardLayout>
        <motion.div className="flex flex-col gap-2.5 p-2.5" variants={pageVariants} initial="hidden" animate="show">
          <motion.div variants={sectionVariants}>
            <WelcomeHeading />
          </motion.div>

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_375px]">
            <div className="flex min-w-0 flex-col gap-2.5">
              <motion.div variants={sectionVariants}>
                <SetupStepsCard steps={steps} onLearnMore={openDocs} />
              </motion.div>

              {showWorkflowsBanner ? (
                <motion.div variants={sectionVariants}>
                  <WelcomeBanner
                    badgeLabel="Notifications"
                    badgeIcon={RiNotification3Line}
                    badgeColorClassName="text-[#fb3748]"
                    badgeBackgroundClassName="bg-primary-alpha-10"
                    title="Send transactional notifications with Workflows"
                    description="Trigger product events, orchestrate delivery across channels, and optionally connect notifications to your agents for follow-up conversations."
                    ctaLabel="Setup workflows"
                    onCtaClick={goToWorkflows}
                  />
                </motion.div>
              ) : null}

              {showAgentsBanner ? (
                <motion.div variants={sectionVariants}>
                  <WelcomeBanner
                    badgeLabel="Conversations"
                    badgeIcon={RiChat3Line}
                    badgeColorClassName="text-[#7d52f4]"
                    badgeBackgroundClassName="bg-[rgba(125,82,244,0.1)]"
                    title="Setup agents to let your users respond to the notifications."
                    description="Workflows can notify users when something happens, and with agents, your users can respond to those notifications and get a response back or take action."
                    ctaLabel="Setup agents"
                    onCtaClick={goToAgentsSetup}
                    learnMore={{ onClick: openDocs }}
                  />
                </motion.div>
              ) : null}
            </div>

            <motion.div variants={sectionVariants}>
              <WelcomeSidebar />
            </motion.div>
          </div>
        </motion.div>
      </DashboardLayout>
    </>
  );
}
