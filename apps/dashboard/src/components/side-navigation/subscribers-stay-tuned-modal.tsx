import { Button } from '@/components/primitives/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from '@/components/primitives/dialog';
import { ReactNode } from 'react';
import { ExternalLink } from '../shared/external-link';

export const SubscribersStayTunedModal = ({ children }: { children: ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <div className="flex justify-center">
          <p className="text-foreground-300 border-foreground-200 inline rounded-sm border border-dashed bg-neutral-50 px-3 py-1 text-center text-[24px] uppercase [word-spacing:0.5rem]">
            📣 Stay tuned
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-foreground text-md font-medium">New subscribers page is coming!</p>
          <p className="text-foreground-600 text-sm">
            In the meantime, you can keep using Novu’s powerful APIs to access your subscribers.
          </p>
        </div>
        <DialogFooter className="items-center [&~button]:hidden" variant="between">
          <ExternalLink
            variant="documentation"
            href="https://docs.novu.co/api-reference/subscribers/get-subscribers"
            className="flex items-center gap-1 text-sm"
          >
            View docs
          </ExternalLink>
          <DialogClose asChild aria-label="Close">
            <Button type="button" variant="primary">
              Alright!
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
