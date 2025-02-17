import { Sheet, SheetContent } from '@/components/primitives/sheet';
import { CreateSubscriberForm } from '@/components/subscribers/create-subscriber-form';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { cn } from '@/utils/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreateSubscriberPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: setOpen,
  });

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigate(-1);
    },
  });

  const combinedRef = useCombinedRefs(unmountRef, protectionRef);

  return (
    <>
      <Sheet open={open} onOpenChange={protectedOnValueChange}>
        {/* Custom overlay since SheetOverlay does not work with modal={false} */}
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !open,
          })}
        />
        <SheetContent ref={combinedRef}>
          <CreateSubscriberForm onSuccess={() => navigate(-1)} />
        </SheetContent>
      </Sheet>

      <ProtectionAlert />
    </>
  );
}
