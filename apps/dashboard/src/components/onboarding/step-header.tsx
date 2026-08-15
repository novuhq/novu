import { RiArrowLeftSLine } from 'react-icons/ri';

type OnboardingStepHeaderProps = {
  current: number;
  /** Path-specific total — agents is 3 steps, inbox fork is 2. */
  total: number;
  /** Omit where there is no previous step to return to — the arrow then renders inert. */
  onBack?: () => void;
};

export function OnboardingStepHeader({ current, total, onBack }: OnboardingStepHeaderProps) {
  return (
    <button
      type="button"
      onClick={onBack}
      disabled={!onBack}
      className="mb-5 flex cursor-pointer items-center gap-0.5 disabled:cursor-default"
    >
      <RiArrowLeftSLine className="text-text-sub size-4" />
      <span className="text-text-sub text-xs">
        {current}/{total}
      </span>
    </button>
  );
}
