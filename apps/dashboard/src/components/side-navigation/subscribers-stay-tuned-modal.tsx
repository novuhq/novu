import { ReactNode } from 'react';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from '../primitives/dialog';
import { Button } from '../primitives/button';
import { RiBookMarkedLine } from 'react-icons/ri';

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
        <DialogFooter className="[&~button]:hidden" variant="between">
          <a
            href="https://docs.novu.co/api-reference/subscribers/get-subscribers"
            rel="noreferrer noopener"
            target="_blank"
            className="flex items-center gap-1 text-sm"
          >
            <RiBookMarkedLine className="h-5 w-5" />
            View docs
          </a>
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
