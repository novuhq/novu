import {
  RiAlertFill,
  RiBookMarkedLine,
  RiCheckboxCircleFill,
  RiCheckLine,
  RiCloseLine,
  RiCornerDownLeftLine,
  RiInformation2Fill,
} from 'react-icons/ri';
import { Button } from '../primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../primitives/dialog';
import { VisuallyHidden } from '../primitives/visually-hidden';

type AgentSetupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSetupClick: () => void;
};

const PUBLISHED_ITEMS = ['Agent metadata (name, AgentID, tags, description)', 'Agent behavior configurations'];

const MISSING_ITEMS = [
  'Agent handler production URL (Bridge endpoint URL)',
  'Integrations (eg: Slack, Resend, MSTeams)',
  'Inbound Email domain setup',
];

export function AgentSetupModal({ isOpen, onClose, onSetupClick }: AgentSetupModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideCloseButton className="min-w-[600px] max-w-[600px] gap-0 overflow-hidden rounded-xl p-0">
        <VisuallyHidden>
          <DialogTitle>Agent published to production</DialogTitle>
          <DialogDescription>Complete the setup to start sending and receiving messages.</DialogDescription>
        </VisuallyHidden>

        {/* Header — grey background */}
        <div className="border-stroke-weak flex flex-col gap-2 border-b bg-[#fbfbfb] p-3">
          <div className="flex items-start justify-between">
            <div className="bg-warning-lighter rounded-lg p-2">
              <RiInformation2Fill className="text-warning-base size-6" />
            </div>
            <button
              onClick={onClose}
              className="text-text-soft hover:text-text-strong transition-colors"
              aria-label="Close"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-label-sm font-medium text-text-strong">Agent published to production</h2>
            <p className="text-label-xs font-medium text-text-soft">
              Your agent is live in production, but not active yet. Complete the setup by configuring integrations and
              adding an inbound domain to start sending and receiving messages.
            </p>
          </div>
        </div>

        {/* Content — white background */}
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-5 items-center justify-center rounded-[6px] bg-[#e0faec]">
                <div className="flex size-3 items-center justify-center rounded-full bg-white shadow-xs">
                  <RiCheckboxCircleFill className="size-[9px] text-success-base" />
                </div>
              </div>
              <span className="text-label-xs font-medium text-success-base">What was published</span>
            </div>
            <div className="flex flex-col gap-2 pl-8">
              {PUBLISHED_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <RiCheckLine className="text-text-sub size-3 shrink-0" />
                  <span className="text-label-xs font-medium text-text-sub">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-warning-lighter flex size-5 items-center justify-center rounded-[6px]">
                <div className="flex size-3 items-center justify-center rounded-full shadow-xs">
                  <RiAlertFill className="text-warning-base size-[9px]" />
                </div>
              </div>
              <span className="text-label-xs font-medium text-warning-base">What is missing</span>
            </div>
            <div className="flex flex-col gap-2 pl-8">
              {MISSING_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <RiCloseLine className="text-text-sub size-3 shrink-0" />
                  <span className="text-label-xs font-medium text-text-sub">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — grey background with top border */}
        <div className="border-stroke-weak flex items-center gap-3 border-t bg-[#fbfbfb] p-3">
          <a
            href="https://docs.novu.co/agents/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-xs text-text-sub hover:text-text-strong inline-flex items-center gap-1 font-medium underline transition-colors"
          >
            <RiBookMarkedLine className="size-5" />
            View docs
          </a>
          <div className="flex flex-1 items-center justify-end">
            <Button variant="primary" mode="gradient" size="xs" trailingIcon={RiCornerDownLeftLine} onClick={onSetupClick}>
              Setup agent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
