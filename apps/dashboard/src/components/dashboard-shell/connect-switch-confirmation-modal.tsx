import type { ReactNode } from 'react';
import { RiArrowRightUpLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';
import { ConnectLogomark } from '@/components/icons/connect-logomark';
import { GithubIcon, LinearIcon, NotionIcon } from '@/components/icons/mcp';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { AGENTS_DOCS_OVERVIEW_URL } from '@/utils/agent-docs';
import { cn } from '@/utils/ui';

type ConnectSwitchConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

const slackIcon = '/images/providers/light/square/slack.svg';
const whatsappIcon = '/images/providers/light/square/whatsapp-business.svg';
const msTeamsIcon = '/images/providers/light/square/msteams.svg';

export function ConnectSwitchConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
}: ConnectSwitchConfirmationModalProps) {
  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="w-[908px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-12 border-stroke-soft p-2 shadow-xl sm:rounded-12"
      >
        <div className="flex gap-1.5">
          <div
            className="relative hidden size-[336px] shrink-0 overflow-hidden rounded-lg bg-[#1a1430] md:block"
            aria-hidden
          >
            <img
              src="/images/connect-switch-orb.png"
              alt=""
              width={336}
              height={336}
              className="size-full object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col md:h-[336px] md:w-[550px]">
            <div className="flex items-start gap-2 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <DialogTitle className="text-text-strong flex items-center gap-1.5 text-[16px] font-medium leading-6 tracking-[-0.176px]">
                  <span>Switch to</span>
                  <ConnectLogomark className="size-[18px]" />
                  <span>Connect</span>
                </DialogTitle>
                <DialogDescription className="text-text-soft text-label-xs leading-4">
                  Here are few things to know.{' '}
                  <a
                    href={AGENTS_DOCS_OVERVIEW_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-text-soft hover:text-text-sub inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                  >
                    Learn more
                    <RiArrowRightUpLine className="size-3.5 shrink-0" aria-hidden />
                  </a>
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <CompactButton size="md" variant="ghost" icon={RiCloseLine}>
                  <span className="sr-only">Close</span>
                </CompactButton>
              </DialogClose>
            </div>

            <ul className="flex flex-1 flex-col gap-3 px-4">
              <FeatureRow>
                <span>Best for: Internal team workflows and personal use-cases</span>
              </FeatureRow>

              <FeatureRow>
                <span>Talk to the agent on</span>
                <IntegrationPill icon={<img src={slackIcon} alt="" className="size-3.5 shrink-0" />}>
                  Slack
                </IntegrationPill>
                <IntegrationPill icon={<img src={whatsappIcon} alt="" className="size-3.5 shrink-0" />}>
                  Whatsapp
                </IntegrationPill>
                <IntegrationPill icon={<img src={msTeamsIcon} alt="" className="size-3.5 shrink-0" />}>
                  MS Teams
                </IntegrationPill>
                <span>and more.</span>
              </FeatureRow>

              <FeatureRow>
                <span>Authorize tools mid-conversation. No setup gauntlets.</span>
              </FeatureRow>

              <FeatureRow>
                <span>Connect tools and MCPs</span>
                <IntegrationPill icon={<GithubIcon className="size-3.5 shrink-0" />}>GitHub</IntegrationPill>
                <IntegrationPill icon={<LinearIcon className="size-3.5 shrink-0" />}>Linear</IntegrationPill>
                <IntegrationPill icon={<NotionIcon className="size-3.5 shrink-0" />}>Notion</IntegrationPill>
                <span>and custom tools your team works on.</span>
              </FeatureRow>
            </ul>

            <div className="flex items-center justify-end p-3">
              <Button
                type="button"
                variant="secondary"
                mode="gradient"
                size="xs"
                trailingIcon={RiArrowRightUpLine}
                onClick={onConfirm}
              >
                Switch to Connect
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureRow({ children }: { children: ReactNode }) {
  return (
    <li className="text-text-sub flex gap-2 text-[14px] font-medium leading-5 tracking-[-0.084px]">
      <RiCheckLine className="text-text-soft mt-1 size-3.5 shrink-0" aria-hidden />
      <span className="flex flex-wrap items-center gap-1">{children}</span>
    </li>
  );
}

type IntegrationPillProps = {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

function IntegrationPill({ icon, children, className }: IntegrationPillProps) {
  return (
    <span
      className={cn(
        'border-stroke-soft bg-bg-weak text-text-strong inline-flex items-center gap-1 rounded border px-1 py-0.5 text-label-sm font-medium',
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
