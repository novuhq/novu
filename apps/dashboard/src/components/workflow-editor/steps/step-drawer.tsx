import { useNavigate } from 'react-router-dom';

import { PageMeta } from '@/components/page-meta';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { cn } from '@/utils/ui';
import { StepTypeEnum } from '@novu/shared';
import { useState } from 'react';

const stepTypeToClassname: Record<string, string | undefined> = {
  [StepTypeEnum.IN_APP]: 'sm:max-w-[600px]',
  [StepTypeEnum.EMAIL]: 'sm:max-w-[800px]',
};

export const StepDrawer = ({ children, title }: { children: React.ReactNode; title?: string }) => {
  const navigate = useNavigate();
  const { workflow, step } = useWorkflow();
  const [isOpen, setIsOpen] = useState(true);

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigate(-1);
    },
  });

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: setIsOpen,
  });

  const combinedRef = useCombinedRefs(unmountRef, protectionRef);

  if (!workflow || !step) {
    return null;
  }

  return (
    <>
      <PageMeta title={title} />
      <Sheet modal={false} open={isOpen} onOpenChange={protectedOnValueChange}>
        <div
          className={cn('animate-in fade-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !isOpen,
          })}
        />
        <SheetContent ref={combinedRef} className={cn(stepTypeToClassname[step.type])}>
          <VisuallyHidden>
            <SheetTitle />
            <SheetDescription />
          </VisuallyHidden>
          {children}
        </SheetContent>
      </Sheet>

      <ProtectionAlert />
    </>
  );
};
