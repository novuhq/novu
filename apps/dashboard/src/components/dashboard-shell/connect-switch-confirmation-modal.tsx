import { RiArrowRightUpLine, RiCheckLine } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { BetaBadge } from '@/components/primitives/beta-badge';

type ConnectSwitchConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ConnectSwitchConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
}: ConnectSwitchConfirmationModalProps) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={
        <span className="flex items-center gap-1.5">
          Switch to Novu Connect?
          <BetaBadge className="shrink-0" />
        </span>
      }
      description={
        <div className="flex flex-col gap-3">
          <p>
            You&apos;re moving to a separate Novu product built for team agents. Your account and login stay the same.
          </p>
          <ul className="flex flex-col gap-2">
            <li className="flex items-start gap-2">
              <RiCheckLine className="text-text-soft mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>We&apos;ll create your Connect workspace automatically.</span>
            </li>
            <li className="flex items-start gap-2">
              <RiCheckLine className="text-text-soft mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>Your agent resources will be provisioned once you continue.</span>
            </li>
            <li className="flex items-start gap-2">
              <RiCheckLine className="text-text-soft mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>You can switch back to Platform anytime from the sidebar.</span>
            </li>
          </ul>
        </div>
      }
      confirmButtonText="Continue to Connect"
      confirmTrailingIcon={RiArrowRightUpLine}
    />
  );
}
