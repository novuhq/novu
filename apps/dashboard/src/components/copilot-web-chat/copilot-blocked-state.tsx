import { RiArrowRightSLine, RiCornerDownLeftLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { linkButtonVariants } from '@/components/primitives/button-link';
import { useAuth } from '@/context/auth/hooks';
import { ROUTES } from '@/utils/routes';
import { CopilotEmptyHero } from './copilot-empty-hero';
import type { CopilotBlockedReason } from './copilot-web-chat-context';

const BOOK_A_CALL_URL = 'https://cal.com/team/novu/intro?utm_campaign=copilot_cloud_only';

function getBlockedPlaceholder(reason: CopilotBlockedReason): string {
  switch (reason) {
    case 'turned-off':
      return 'Copilot is off for this organization';
    case 'cloud-only':
      return 'Available on Novu Cloud';
    default: {
      const unhandled: never = reason;

      return unhandled;
    }
  }
}

function TurnedOffState() {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const title = currentOrganization?.name ? `Copilot is off for ${currentOrganization.name}` : 'Copilot is off';

  return (
    <>
      <CopilotEmptyHero
        title={title}
        body="An admin turned it off for this organization. Turn it on in Organization settings."
      />
      <Button
        type="button"
        variant="secondary"
        mode="outline"
        size="2xs"
        onClick={() => void navigate(ROUTES.SETTINGS_ORGANIZATION)}
      >
        Open settings
      </Button>
    </>
  );
}

function CloudOnlyState() {
  const { root, icon } = linkButtonVariants({ variant: 'black', size: 'sm' });

  return (
    <>
      <CopilotEmptyHero
        title="Copilot runs on Novu Cloud"
        body="It is not available in Community or self-hosted Novu. Your data stays on your servers."
      />
      <a href={BOOK_A_CALL_URL} target="_blank" rel="noreferrer" className={root({ class: 'text-label-xs' })}>
        Book a call
        <RiArrowRightSLine className={icon()} aria-hidden />
      </a>
    </>
  );
}

function BlockedStateContent({ reason }: { reason: CopilotBlockedReason }) {
  switch (reason) {
    case 'turned-off':
      return <TurnedOffState />;
    case 'cloud-only':
      return <CloudOnlyState />;
    default: {
      const unhandled: never = reason;

      return unhandled;
    }
  }
}

/** Takes the conversation's place when the Copilot can't run in this organization, and says why. */
export function CopilotBlockedState({ reason }: { reason: CopilotBlockedReason }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-3 pt-4">
      <div className="my-auto flex flex-col items-center gap-3.5">
        <BlockedStateContent reason={reason} />
      </div>
    </div>
  );
}

/** The composer of a Copilot that can't run here: greyed out, saying why, and taking no input. */
export function CopilotBlockedComposer({ reason }: { reason: CopilotBlockedReason }) {
  return (
    <div className="flex flex-col p-3 pt-0">
      <div className="flex flex-col rounded-md bg-bg-weak">
        <textarea
          disabled
          rows={2}
          aria-label="Message Copilot"
          placeholder={getBlockedPlaceholder(reason)}
          className="w-full cursor-not-allowed resize-none bg-transparent px-3 pt-3 text-label-xs outline-none placeholder:text-text-soft placeholder:opacity-70"
        />
        <div className="flex justify-end p-1.5 opacity-40">
          <span aria-hidden className="flex size-6 items-center justify-center rounded-md text-text-disabled">
            <RiCornerDownLeftLine className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
