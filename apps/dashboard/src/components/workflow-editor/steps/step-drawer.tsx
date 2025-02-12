import { useNavigate } from 'react-router-dom';

import { FormProtection } from '@/components/form-protection';
import { PageMeta } from '@/components/page-meta';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { cn } from '@/utils/ui';
import { StepTypeEnum } from '@novu/shared';
import { useRef, useState } from 'react';

const stepTypeToClassname: Record<string, string | undefined> = {
  [StepTypeEnum.IN_APP]: 'sm:max-w-[600px]',
  [StepTypeEnum.EMAIL]: 'sm:max-w-[800px]',
};

export const StepDrawer = ({ children, title }: { children: React.ReactNode; title?: string }) => {
  const navigate = useNavigate();
  const { workflow, step } = useWorkflow();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);

  useOnElementUnmount({
    element: sheetRef.current,
    callback: () => {
      navigate(-1);
    },
  });

  const { isFormDirty, setShowAlert, showAlert } = useFormProtection(sheetRef);

  if (!workflow || !step) {
    return null;
  }

  return (
    <>
      <PageMeta title={title} />
      <Sheet
        modal={false}
        open={isOpen}
        onOpenChange={(open) => {
          if (isFormDirty) {
            return setShowAlert(true);
          }
          setIsOpen(open);
        }}
      >
        <div
          className={cn('animate-in fade-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !isOpen,
          })}
        />
        <SheetContent ref={sheetRef} className={cn(stepTypeToClassname[step.type])}>
          <VisuallyHidden>
            <SheetTitle />
            <SheetDescription />
          </VisuallyHidden>
          {children}
        </SheetContent>
      </Sheet>

      <FormProtection onClose={() => setIsOpen(false)} showAlert={showAlert} setShowAlert={setShowAlert} />
    </>
  );
};
