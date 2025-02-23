import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { SubscriberTabs } from '@/components/subscribers/subscriber-tabs';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useFormProtection } from '@/hooks/use-form-protection';
import { cn } from '@/utils/ui';
import { forwardRef, useState } from 'react';

type SubscriberDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriberId: string;
  readOnly?: boolean;
};

export const SubscriberDrawer = forwardRef<HTMLDivElement, SubscriberDrawerProps>((props, forwardedRef) => {
  const { open, onOpenChange, subscriberId, readOnly = false } = props;

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: onOpenChange,
  });

  const combinedRef = useCombinedRefs(forwardedRef, protectionRef);

  return (
    <>
      <Sheet modal={false} open={open} onOpenChange={protectedOnValueChange}>
        {/* Custom overlay since SheetOverlay does not work with modal={false} */}
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !open,
          })}
        />
        <SheetContent ref={combinedRef}>
          <VisuallyHidden>
            <SheetTitle />
            <SheetDescription />
          </VisuallyHidden>
          <SubscriberTabs subscriberId={subscriberId} readOnly={readOnly} />
        </SheetContent>
      </Sheet>

      <ProtectionAlert />
    </>
  );
});

type SubscriberDrawerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  subscriberId: string;
  readOnly?: boolean;
};

export const SubscriberDrawerButton = (props: SubscriberDrawerButtonProps) => {
  const { subscriberId, onClick, readOnly = false, ...rest } = props;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        {...rest}
        onClick={(e) => {
          setOpen(true);
          onClick?.(e);
        }}
      />
      <SubscriberDrawer open={open} onOpenChange={setOpen} subscriberId={subscriberId} readOnly={readOnly} />
    </>
  );
};
