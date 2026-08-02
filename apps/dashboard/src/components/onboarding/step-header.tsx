import { RiArrowLeftSLine } from 'react-icons/ri';

/** Conversations onboarding: pick a path, personalize, then connect the agent. */
const ONBOARDING_TOTAL_STEPS = 3;

type OnboardingStepHeaderProps = {
  current: number;
  /** Omit where there is no previous step to return to — the arrow then renders inert. */
  onBack?: () => void;
};

export function OnboardingStepHeader({ current, onBack }: OnboardingStepHeaderProps) {
  return (
    <button
      type="button"
      onClick={onBack}
      disabled={!onBack}
      className="mb-5 flex cursor-pointer items-center gap-0.5 disabled:cursor-default"
    >
      <RiArrowLeftSLine className="text-text-sub size-4" />
      <span className="text-text-sub text-xs">
        {current}/{ONBOARDING_TOTAL_STEPS}
      </span>
    </button>
  );
}
