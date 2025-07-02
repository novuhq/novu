import { forwardRef, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { Separator } from '@/components/primitives/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { ExternalLink } from '@/components/shared/external-link';
import { CreateLayoutForm } from '@/components/layouts/create-layout-form';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useCombinedRefs } from '@/hooks/use-combined-refs';

type NewLayoutDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export const NewLayoutDrawer = forwardRef<HTMLDivElement, NewLayoutDrawerProps>((props, forwardedRef) => {
  const { isOpen, onOpenChange, onSuccess, onCancel } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: onOpenChange,
  });

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      if (onCancel) {
        onCancel();
      }
    },
    condition: !isOpen,
  });

  const combinedRef = useCombinedRefs(forwardedRef, unmountRef, protectionRef);

  const handleSuccess = () => {
    onOpenChange(false);

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <Sheet modal={false} open={isOpen} onOpenChange={protectedOnValueChange}>
        <SheetContent ref={combinedRef}>
          <SheetHeader>
            <SheetTitle>Create layout</SheetTitle>
            <div>
              <SheetDescription>
                Create a reusable email layout template for your notifications.{' '}
                <ExternalLink href="https://docs.novu.co/platform/concepts/layouts">Learn more</ExternalLink>
              </SheetDescription>
            </div>
          </SheetHeader>
          <Separator />
          <SheetMain>
            <CreateLayoutForm
              onSuccess={handleSuccess}
              onError={() => setIsSubmitting(false)}
              onSubmitStart={() => setIsSubmitting(true)}
            />
          </SheetMain>
          <Separator />
          <SheetFooter>
            <Button
              isLoading={isSubmitting}
              trailingIcon={RiArrowRightSLine}
              variant="secondary"
              mode="gradient"
              type="submit"
              form="create-layout"
            >
              Create layout
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {ProtectionAlert}
    </>
  );
});
