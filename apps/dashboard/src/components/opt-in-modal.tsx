import { CircleCheck } from '@/components/icons/circle-check';
import { OptInArrow } from '@/components/icons/opt-in-arrow';
import { PartyPopover } from '@/components/icons/party-popover';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/primitives/dialog';
import { useNewDashboardOptIn } from '@/hooks/use-new-dashboard-opt-in';
import { RiCustomerService2Line } from 'react-icons/ri';

export const OptInModal = () => {
  const { isFirstVisit, updateNewDashboardFirstVisit } = useNewDashboardOptIn();

  if (!isFirstVisit) {
    return null;
  }

  return (
    <Dialog modal open={!!isFirstVisit} onOpenChange={updateNewDashboardFirstVisit}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="p-0">
          <div className="flex items-start gap-4 self-stretch">
            <Image />
            <div className="flex w-[383px] flex-col items-start">
              <Header />
              <CheckBulletPoint
                content={
                  <span>
                    We're still building and welcome your feedback — share your thoughts using{' '}
                    <RiCustomerService2Line className="inline" /> in the top right.
                  </span>
                }
              />
              <CheckBulletPoint content="You can switch back to the legacy UI anytime from the user profile menu in the top right." />
              <CheckBulletPoint content="Create workflows with in-app steps on the new dashboard; support for more steps is coming soon." />
              <Footer />
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

const Image = () => (
  <div className="relative">
    <img src="/images/opt-in.png" alt="New Dashboard Preview" />
    <div
      className="absolute inset-0 rounded-lg"
      style={{ background: 'linear-gradient(163deg, rgba(255, 255, 255, 0.00) 7.65%, #FFF 92.93%)' }}
    />
    <div className="absolute bottom-[13px] left-[13px] flex w-[158.5px] flex-col items-start">
      <span className="text-success text-[10px] font-normal italic">We're doing light mode for now!</span>
      <OptInArrow className="absolute bottom-[-11.505px] left-[152.5px]" />
    </div>
  </div>
);

const Header = () => (
  <div className="flex items-start justify-between gap-1 self-stretch p-3">
    <div className="flex flex-1 flex-col items-start gap-1">
      <DialogTitle className="text-lg font-medium">Thanks for opting-in! 🎉</DialogTitle>
      <DialogDescription className="text-foreground-400 text-xs font-normal">
        Get an early look at our new Dashboard.
      </DialogDescription>
    </div>
  </div>
);

const CheckBulletPoint = ({ content }: { content: React.ReactNode }) => (
  <div className="flex items-center gap-1 px-3 py-2">
    <CircleCheck />
    <div className="text-foreground-500 px-2 py-1 text-xs font-medium">{content}</div>
  </div>
);

const Footer = () => (
  <div className="flex w-full justify-end p-3">
    <DialogClose asChild aria-label="Close">
      <Button type="button" size="sm" variant="primary" className="gap-2 p-2">
        I'm in <PartyPopover />
      </Button>
    </DialogClose>
  </div>
);
