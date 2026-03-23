import { forwardRef, useId, useRef, useState } from 'react';
import { RiArrowRightSLine, RiCodeSSlashLine } from 'react-icons/ri';
import type { EnvironmentVariableResponseDto } from '@/api/environment-variables';
import { Button } from '@/components/primitives/button';
import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetMain, SheetTitle } from '@/components/primitives/sheet';
import { useEnvironment } from '@/context/environment/hooks';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { cn } from '@/utils/ui';
import { UpsertVariableForm } from './upsert-variable-form';

type UpsertVariableDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
  variable?: EnvironmentVariableResponseDto;
};

export const UpsertVariableDrawer = forwardRef<HTMLDivElement, UpsertVariableDrawerProps>((props, forwardedRef) => {
  const { isOpen, onOpenChange, onSuccess, onCancel, variable } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId = useId();
  const { environments = [] } = useEnvironment();
  const isEditing = !!variable;
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) setIsSubmitting(false);
    onOpenChange(open);
  };

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: handleOpenChange,
  });

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      if (onCancel) onCancel();
    },
    condition: !isOpen,
  });

  const combinedRef = useCombinedRefs(forwardedRef, unmountRef, protectionRef);

  const handleSuccess = () => {
    handleOpenChange(false);
    onSuccess?.();
  };

  const handleInteractOutside = (e: Event) => {
    const target = e.target as Node;
    if (overlayRef.current?.contains(target)) {
      protectedOnValueChange(false);
    } else {
      e.preventDefault();
    }
  };

  return (
    <>
      <Sheet modal={false} open={isOpen} onOpenChange={protectedOnValueChange}>
        <div
          ref={overlayRef}
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !isOpen,
          })}
        />
        <SheetContent ref={combinedRef} className="w-[480px]" onInteractOutside={handleInteractOutside}>
          <SheetHeader className="px-3 py-1.5">
            <SheetTitle className="flex items-center gap-1.5">
              <RiCodeSSlashLine className="size-4" />
              {isEditing ? 'Edit variable' : 'Create variable'}
            </SheetTitle>
          </SheetHeader>
          <Separator />
          <SheetMain className="px-3 py-5">
            <UpsertVariableForm
              formId={formId}
              environments={environments}
              variable={variable}
              onSuccess={handleSuccess}
              onError={() => setIsSubmitting(false)}
              onSubmitStart={() => setIsSubmitting(true)}
            />
          </SheetMain>
          <Separator />
          <SheetFooter className="justify-end p-3">
            <Button
              variant="secondary"
              size="xs"
              mode="gradient"
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              trailingIcon={RiArrowRightSLine}
              form={formId}
            >
              {isEditing ? 'Save variable' : 'Create variable'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {ProtectionAlert}
    </>
  );
});

UpsertVariableDrawer.displayName = 'UpsertVariableDrawer';
