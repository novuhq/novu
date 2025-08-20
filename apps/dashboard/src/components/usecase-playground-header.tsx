import { RiArrowLeftSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Stepper } from './onboarding/stepper';
import { CompactButton } from './primitives/button-compact';
import { LinkButton } from './primitives/button-link';

interface UsecasePlaygroundHeaderProps {
  title: string;
  description: string;
  skipPath?: string;
  onSkip?: () => void;
  showSkipButton?: boolean;
  showBackButton?: boolean;
  showStepper?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export function UsecasePlaygroundHeader({
  title,
  description,
  skipPath,
  onSkip,
  showSkipButton = false,
  showBackButton = true,
  showStepper = true,
  currentStep = 1,
  totalSteps = 1,
}: UsecasePlaygroundHeaderProps) {
  const navigate = useNavigate();

  const handleSkip = () => {
    onSkip?.();

    if (skipPath) {
      navigate(skipPath);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b pr-6">
      <div className="flex pl-3">
        {showBackButton && (
          <CompactButton
            icon={RiArrowLeftSLine}
            variant="ghost"
            className="mt-[16px] h-5 w-5"
            onClick={() => navigate(-1)}
          />
        )}

        <div className="flex-1 py-3 pr-3 pt-3">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-foreground-400 pb-1.5 text-sm">{description}</p>
        </div>
      </div>

      {showSkipButton ? (
        <div className="flex h-7 w-[168px] flex-col items-end gap-2">
          {/* Progress bar */}
          {showStepper && (
            <div className="flex h-1 w-[100px] gap-1">
              {Array.from({ length: totalSteps }, (_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full ${
                    index < currentStep ? 'bg-foreground-950' : 'bg-foreground-950/10'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Skip button and step indicator row */}
          <div className="flex h-4 w-[168px] items-center justify-center gap-2">
            <LinkButton
              variant="gray"
              size="sm"
              onClick={handleSkip}
              className="text-foreground-600 h-4 !text-xs !font-medium !leading-4"
            >
              Skip, I'll explore myself
            </LinkButton>

            <div className="h-0.5 w-0.5 rounded-full bg-black/30" />

            <span className="text-foreground-600 text-xs font-medium leading-4">
              {currentStep}/{totalSteps}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {showStepper && <Stepper currentStep={currentStep} totalSteps={totalSteps} />}
        </div>
      )}
    </div>
  );
}
