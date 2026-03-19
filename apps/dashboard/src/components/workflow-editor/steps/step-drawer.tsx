import { StepTypeEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageMeta } from '@/components/page-meta';
import { Sheet, SheetContentBase, SheetDescription, SheetPortal, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { cn } from '@/utils/ui';

const transitionSetting = { ease: [0.29, 0.83, 0.57, 0.99], duration: 0.4 };
const stepTypeToClassname: Record<string, string | undefined> = {
  [StepTypeEnum.IN_APP]: 'sm:max-w-[600px]',
  [StepTypeEnum.EMAIL]: 'sm:max-w-[800px]',
};

export const StepDrawer = ({
  children,
  title,
  maxWidth,
}: {
  children: React.ReactNode;
  title?: string;
  maxWidth?: string;
}) => {
  const id = useId();
  const navigate = useNavigate();
  const { workflow, step } = useWorkflow();

  const handleCloseSheet = useCallback(() => {
    if (step) {
      // Do not use relative path here, calling twice will result in moving further back
      navigate(`../steps/${step.slug}`);
    }
  }, [navigate, step]);

  useEscapeKeyManager(id, handleCloseSheet, EscapeKeyManagerPriority.SHEET);

  if (!workflow || !step) {
    return null;
  }

  return (
    <>
      <PageMeta title={title} />
      <Sheet modal={false} open>
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="fixed inset-0 z-50 h-screen w-screen bg-black/20"
          transition={transitionSetting}
          onClick={handleCloseSheet}
        />
        <SheetPortal>
          <SheetContentBase
            asChild
            onInteractOutside={(e) => {
              // IMPORTANT DO NOT REMOVE
              // we don’t want to close the sheet if interacting outside,
              // happens on the dropdowns, elements that are rendered outside the component tree
              // for example maily variable list, the conditions operators
              e.preventDefault();
            }}
          >
            <motion.div
              initial={{
                x: '100%',
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: '100%',
              }}
              transition={transitionSetting}
              className={cn(
                'bg-background fixed inset-y-0 right-0 z-50 flex h-full w-3/4 flex-col border-l shadow-lg outline-hidden sm:max-w-[600px]',
                maxWidth || stepTypeToClassname[step.type]
              )}
            >
              <VisuallyHidden>
                <SheetTitle />
                <SheetDescription />
              </VisuallyHidden>
              {children}
            </motion.div>
          </SheetContentBase>
        </SheetPortal>
      </Sheet>
    </>
  );
};
