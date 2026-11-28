import { RiCheckLine, RiCloseLine, RiSparkling2Line } from 'react-icons/ri';
import { Button } from '../primitives/button';

type LegacyCopilotMigrationBannerProps = {
  isActionPending?: boolean;
  isGenerating?: boolean;
  canResolve: boolean;
  onKeepAll: () => void;
  onDiscard: () => void;
};

export function LegacyCopilotMigrationBanner({
  isActionPending,
  isGenerating,
  canResolve,
  onKeepAll,
  onDiscard,
}: LegacyCopilotMigrationBannerProps) {
  const isDisabled = !canResolve || isActionPending || isGenerating;

  return (
    <div className="bg-bg-weak border-stroke-soft mx-3 mt-3 flex shrink-0 flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <RiSparkling2Line className="text-icon-sub mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-label-xs text-text-strong font-medium">Novu Copilot has a new experience</span>
          <span className="text-label-xs text-text-sub">
            This workflow has changes from the previous Copilot waiting for your review. Keep or discard them to switch
            to the new Copilot.
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="2xs"
          mode="outline"
          trailingIcon={RiCloseLine}
          onClick={onDiscard}
          disabled={isDisabled}
        >
          Discard
        </Button>
        <Button
          variant="primary"
          size="2xs"
          mode="gradient"
          trailingIcon={RiCheckLine}
          onClick={onKeepAll}
          disabled={isDisabled}
        >
          Keep all
        </Button>
      </div>
    </div>
  );
}
