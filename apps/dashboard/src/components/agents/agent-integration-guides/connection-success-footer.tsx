import { motion } from 'motion/react';
import { RiArrowRightLine } from 'react-icons/ri';
import { CompletedStepIndicator } from '@/components/agents/setup-guide-primitives';
import { Button } from '@/components/primitives/button';

/**
 * The "Continue" step, rendered inline at the end of the setup card (not as a separate card) so it
 * reads as the natural conclusion of the setup flow and can't be missed/overlooked below the fold.
 *
 * `hasUserRolloutPhase` is true only for providers whose connected view implements the "what's next"
 * user-rollout flow (see `providerHasWhatsNextPhase`). For those we promise the rollout step; every
 * other provider gets a generic continue note so we don't advertise a phase that doesn't exist yet.
 */
export function ConnectionSuccessFooter({
  providerDisplayName,
  hasUserRolloutPhase,
  onContinue,
}: {
  providerDisplayName: string;
  hasUserRolloutPhase: boolean;
  onContinue: () => void;
}) {
  const title = hasUserRolloutPhase ? 'Make your agent available to your users' : 'Your agent is connected';
  const description = hasUserRolloutPhase
    ? `You've connected it for yourself. Continue to roll it out so your own users can reach it from their ${providerDisplayName}.`
    : `You've connected ${providerDisplayName} for yourself. Continue to view and manage your connection details.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="border-stroke-soft mt-2 flex flex-col gap-3 border-t pl-8 pt-4 md:flex-row md:items-center md:justify-between md:gap-6"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-px shrink-0">
          <CompletedStepIndicator />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-text-strong text-label-sm font-medium leading-5">{title}</p>
          <p className="text-text-soft text-label-xs leading-4">{description}</p>
        </div>
      </div>
      <Button
        variant="primary"
        size="xs"
        type="button"
        onClick={onContinue}
        trailingIcon={RiArrowRightLine}
        className="shrink-0 self-start md:self-center"
      >
        Continue
      </Button>
    </motion.div>
  );
}
