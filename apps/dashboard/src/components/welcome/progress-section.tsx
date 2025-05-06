import { Card, CardContent } from '../primitives/card';
import { RiArrowRightDoubleFill, RiCheckLine, RiLoader3Line } from 'react-icons/ri';
import { useOnboardingSteps, StepIdEnum } from '../../hooks/use-onboarding-steps';
import { Link, useParams } from 'react-router-dom';
import { buildRoute, ROUTES } from '../../utils/routes';
import { motion } from 'motion/react';
import { mainCard, leftSection, textItem, stepsList, stepItem, logo } from './progress-section.animations';
import { PointingArrow, NovuLogo } from './icons';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';

interface StepItemProps {
  step: {
    id: StepIdEnum;
    status: string;
    title: string;
    description: string;
  };
  environmentSlug?: string;
}

export function ProgressSection() {
  const { environmentSlug } = useParams<{ environmentSlug?: string }>();
  const { steps } = useOnboardingSteps();

  return (
    <motion.div variants={mainCard} initial="hidden" animate="show">
      <Card className="relative flex items-stretch gap-2 rounded-xl border-neutral-100 shadow-none">
        <WelcomeHeader />

        <motion.div className="flex flex-1 flex-col gap-3 p-6" variants={stepsList}>
          {steps.map((step, index) => (
            <StepItem key={index} step={step} environmentSlug={environmentSlug} />
          ))}
        </motion.div>

        <motion.div variants={logo} className="absolute bottom-0 right-0">
          <NovuLogo />
        </motion.div>
      </Card>
    </motion.div>
  );
}

function StepItem({ step, environmentSlug }: StepItemProps) {
  const telemetry = useTelemetry();

  const handleStepClick = () => {
    telemetry(TelemetryEvent.WELCOME_STEP_CLICKED, {
      stepId: step.id,
      stepTitle: step.title,
      stepStatus: step.status,
    });
  };

  return (
    <motion.div className="flex max-w-[370px] items-center gap-1.5" variants={stepItem}>
      <div
        className={`${step.status === 'completed' ? 'bg-success' : 'shadow-xs'} flex h-6 w-6 min-w-6 items-center justify-center rounded-full`}
      >
        {step.status === 'completed' ? (
          <RiCheckLine className="h-4 w-4 text-[#ffffff]" />
        ) : (
          <RiLoader3Line className="text-foreground-400 h-4 w-4" />
        )}
      </div>

      <Link
        to={getStepRoute(step.id, environmentSlug).path}
        reloadDocument={getStepRoute(step.id, environmentSlug).isLegacy}
        className="w-full"
        onClick={handleStepClick}
      >
        <Card
          className={`shadow-xs w-full p-1 ${step.status !== 'completed' ? 'transition-all duration-200 hover:translate-x-[1px] hover:shadow-md' : ''}`}
        >
          <CardContent className="flex flex-col rounded-[6px] bg-[#FBFBFB] px-2 py-1.5">
            <div className="flex items-center justify-between">
              <span
                className={`text-xs ${step.status === 'completed' ? 'text-foreground-400 line-through' : 'text-foreground-600'}`}
              >
                {step.title}
              </span>
              <RiArrowRightDoubleFill className="text-foreground-400 h-4 w-4" />
            </div>
            <p className="text-foreground-400 text-[10px] leading-[14px]">{step.description}</p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function WelcomeHeader() {
  return (
    <motion.div
      variants={leftSection}
      className="flex w-full max-w-[380px] grow flex-col items-start justify-between gap-2 rounded-l-xl bg-[#FBFBFB] p-6"
    >
      <div className="flex w-full flex-col gap-2">
        <motion.h2 variants={textItem} className="font-label-medium text-base font-medium">
          You're doing great work! 💪
        </motion.h2>

        <div className="text-foreground-400 flex flex-col gap-6 text-sm">
          <motion.p variants={textItem}>Set up Novu to send notifications your users will love.</motion.p>
          <motion.p variants={textItem}>
            Streamline all your customer messaging in one tool and delight them at every touchpoint.
          </motion.p>
        </div>
      </div>

      <motion.div variants={textItem} className="space-between flex items-center gap-0">
        <p className="text-foreground-400 text-sm">Get started with our setup guide.</p>
        <PointingArrow className="relative left-[15px] top-[-10px]" />
      </motion.div>
    </motion.div>
  );
}

function getStepRoute(stepId: StepIdEnum, environmentSlug: string = '') {
  switch (stepId) {
    case StepIdEnum.CREATE_A_WORKFLOW:
      return {
        path: buildRoute(ROUTES.WORKFLOWS, { environmentSlug }),
        isLegacy: false,
      };
    case StepIdEnum.CONNECT_EMAIL_PROVIDER:
    case StepIdEnum.CONNECT_PUSH_PROVIDER:
    case StepIdEnum.CONNECT_CHAT_PROVIDER:
    case StepIdEnum.CONNECT_SMS_PROVIDER:
      return {
        path: buildRoute(ROUTES.INTEGRATIONS, { environmentSlug }),
        isLegacy: false,
      };
    case StepIdEnum.CONNECT_IN_APP_PROVIDER:
      return {
        path: ROUTES.INBOX_EMBED,
        isLegacy: false,
      };
    case StepIdEnum.INVITE_TEAM_MEMBER:
      return {
        path: ROUTES.SETTINGS_TEAM,
        isLegacy: false,
      };
    default:
      return {
        path: '#',
        isLegacy: false,
      };
  }
}
