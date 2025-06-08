import { useEnvironment } from '@/context/environment/hooks';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { useUser } from '@clerk/clerk-react';
import { motion } from 'motion/react';
import { RiCloseFill, RiQuestionLine, RiSparkling2Fill } from 'react-icons/ri';
import { useOnboardingSteps } from '../../hooks/use-onboarding-steps';
import { Badge, BadgeIcon } from '../primitives/badge';
import { CompactButton } from '../primitives/button-compact';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { NavigationLink } from './navigation-link';

export function GettingStartedMenuItem() {
  const { totalSteps, completedSteps, steps } = useOnboardingSteps();

  const { currentEnvironment } = useEnvironment();
  const { user } = useUser();
  const track = useTelemetry();

  const allStepsCompleted = completedSteps === totalSteps;

  const handleClose = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    track(TelemetryEvent.WELCOME_MENU_HIDDEN, {
      completedSteps: steps.filter((step) => step.status === 'completed').map((step) => step.id),
      totalSteps,
      allStepsCompleted,
    });

    await user?.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        hideGettingStarted: true,
      },
    });
  };

  if (user?.unsafeMetadata?.hideGettingStarted) {
    return null;
  }

  return (
    <motion.div className="contents" whileHover="hover" initial="initial">
      <NavigationLink to={buildRoute(ROUTES.WELCOME, { environmentSlug: currentEnvironment?.slug ?? '' })}>
        <RiQuestionLine className="size-4" />
        <span>Getting started</span>

        <Badge color="red" size="md" variant="lighter">
          <motion.div
            variants={{
              initial: { scale: 1, rotate: 0, opacity: 1 },
              hover: {
                scale: [1, 1.1, 1],
                rotate: [0, 4, -4, 0],
                opacity: [0, 1, 1],
                transition: {
                  duration: 1.4,
                  repeat: 0,
                  ease: 'easeInOut',
                },
              },
            }}
          >
            <BadgeIcon as={RiSparkling2Fill} />
          </motion.div>
          <span className="text-xs">
            {completedSteps}/{totalSteps}
          </span>
        </Badge>

        {allStepsCompleted && (
          <motion.div
            className="ml-auto h-4 w-4"
            variants={{
              initial: { opacity: 0 },
              hover: { opacity: 1 },
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <CompactButton
                  size="md"
                  icon={RiCloseFill}
                  variant="ghost"
                  onClick={handleClose}
                  className="h-4 w-4 hover:bg-neutral-300"
                  aria-label="Close getting started menu"
                >
                  <span className="sr-only">Close</span>
                </CompactButton>
              </TooltipTrigger>
              <TooltipContent>This will hide the Getting Started page</TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </NavigationLink>
    </motion.div>
  );
}
