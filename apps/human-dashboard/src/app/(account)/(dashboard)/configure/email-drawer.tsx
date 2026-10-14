'use client';

import { LinkIcon, Plus } from 'lucide-react';

import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { toast } from '@/components/ui/toast';

import { SECTION_LABEL } from './channel-list';

type EmailDrawerProps = {
  /** How the agent is called in a sentence: its address without the domain. */
  handle: string;
  /** The agent's own address, or `null` while it has none. */
  address: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The Email row's drawer: the agent's address, and its own domain as a paid extra. The domain's setup
 * comes later (NV-9031); until then the operator can only ask for it.
 */
export function EmailDrawer({ handle, address, open, onOpenChange }: EmailDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title="Email"
        description={`People email ${handle} here.`}
        // A narrower drawer than Telegram's and Slack's, with a line under the header and 20px to the edges.
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
          <h3 className={SECTION_LABEL}>Address</h3>
          {address ? (
            <>
              <div className="flex items-center gap-2.5 rounded-md border border-border-strong bg-subtle py-2.25 pr-2.5 pl-3">
                <p className="min-w-0 flex-1 truncate font-mono text-[13px] leading-4.5 text-foreground">{address}</p>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] leading-4 text-secondary">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                  active
                </span>
                <CopyButton
                  value={address}
                  label="Copy the email address"
                  className="size-4 shrink-0 rounded-sm text-secondary hover:bg-transparent hover:text-foreground"
                />
              </div>
              <p className="text-xs leading-4 text-secondary">Ready to use.</p>
            </>
          ) : (
            <p className="text-xs leading-4 text-secondary">
              {handle} has no address yet. Run npx @agentinbox/cli channel add email in your terminal to give it one.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <h3 className={SECTION_LABEL}>Your domain</h3>
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong p-4">
            <div className="flex items-center gap-2.5">
              <LinkIcon aria-hidden="true" className="size-3.5 shrink-0 text-secondary" />
              <h4 className="text-[13px] leading-4.5 font-medium text-foreground">Send as {handle}@yourcompany</h4>
              <span className="rounded border border-accent/45 bg-accent/12 px-1.5 py-px font-mono text-[10px] leading-[normal] font-medium text-accent">
                PAID
              </span>
            </div>
            <p className="text-xs leading-4.25 text-secondary">
              Use a domain you own, so people see your company’s name. About 10 minutes if you can edit DNS.
            </p>
            <Button
              variant="secondary"
              className={SMALL_BUTTON}
              // Nothing records the request yet: the toast is all there is until custom domains come (NV-9031).
              onClick={() => toast('Access requested', 'success', 'We’ll email you when your own domain is available.')}
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Request access
              <span className="sr-only"> to your own domain</span>
            </Button>
          </div>
        </section>
      </DrawerContent>
    </Drawer>
  );
}
