'use client';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';

import { SECTION_LABEL } from './channel-list';

type VoiceDrawerProps = {
  /** How the agent is called in a sentence. */
  handle: string;
  /** Whether the shared number is linked to this agent. */
  linked: boolean;
  /** The shared number people are called from, when the channel reports one. */
  number: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The Voice row's drawer. The number is shared; a person is called only after they confirm their own
 * number from an invite.
 */
export function VoiceDrawer({ handle, linked, number, open, onOpenChange }: VoiceDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title="Voice"
        description={`${handle} calls people from a shared number.`}
        className="max-w-140"
        headerClassName="items-center border-b border-border px-5 py-4.5 [&>button]:m-0 [&>div]:gap-0.5"
        bodyClassName="gap-6.5 px-5 py-5.5"
        footerClassName="px-5 py-3.5"
        footer={
          <DrawerClose asChild>
            <Button>Done</Button>
          </DrawerClose>
        }
      >
        <section className="flex flex-col gap-2.5">
          <h3 className={SECTION_LABEL}>Number</h3>
          {number ? (
            <div className="flex items-center gap-2.5 rounded-md border border-border-strong bg-subtle py-2.25 pr-2.5 pl-3">
              <p className="min-w-0 flex-1 truncate font-mono text-[13px] leading-4.5 text-foreground">{number}</p>
              <CopyButton
                value={number}
                label="Copy the phone number"
                className="size-4 shrink-0 rounded-sm text-secondary hover:bg-transparent hover:text-foreground"
              />
            </div>
          ) : null}
          {linked ? (
            <p className="text-xs leading-4 text-secondary">
              People confirm their own number from the invite before {handle} can call them.
            </p>
          ) : (
            <p className="text-xs leading-4 text-secondary">
              {handle} has no phone number yet. Run npx @agentinbox/cli channel add voice in your terminal to link the
              shared number.
            </p>
          )}
        </section>
      </DrawerContent>
    </Drawer>
  );
}
