import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { RiDeleteBin2Line, RiEdit2Line, RiFileCopyLine } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import TruncatedText from '@/components/truncated-text';
import { StepTypeEnum } from '@/utils/enums';

const CHANNEL_STEP_TYPES = [
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.IN_APP,
  StepTypeEnum.PUSH,
  StepTypeEnum.CHAT,
];

type WorkflowNodeActionBarProps = {
  isVisible: boolean;
  stepType?: StepTypeEnum;
  stepName: string;
  onRemoveClick: () => void;
  onEditContentClick: () => void;
  onCopyClick: () => void;
  isReadOnly: boolean;
};

export const WorkflowNodeActionBar = ({
  isVisible,
  stepType,
  stepName,
  onRemoveClick,
  onEditContentClick,
  onCopyClick,
  isReadOnly,
}: WorkflowNodeActionBarProps) => {
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isChannelStep = stepType && CHANNEL_STEP_TYPES.includes(stepType);

  const handleCopyConfirm = () => {
    onCopyClick();
    setIsCopyModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    onRemoveClick();
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                delay: 0.6,
                type: 'spring',
                stiffness: 400,
                damping: 30,
                mass: 0.6,
              },
            }}
            exit={{
              opacity: 0,
              y: 4,
              transition: {
                duration: 0.15,
                ease: 'easeInOut',
              },
            }}
            className="action-bar-trigger pointer-events-auto absolute left-0 right-0 top-[-38px] z-50 flex justify-center"
            style={{
              pointerEvents: 'auto',
              transformOrigin: 'top center',
            }}
          >
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{
                scaleY: 1,
                opacity: 0.8,
                transition: {
                  delay: 0.05,
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                },
              }}
              exit={{
                scaleY: 0,
                opacity: 0,
                transition: {
                  duration: 0.1,
                  ease: 'easeIn',
                },
              }}
              className="absolute left-1/2 top-[-12px] h-3 w-[2px] -translate-x-1/2 bg-gradient-to-t from-neutral-200 to-transparent"
              style={{ transformOrigin: 'bottom center' }}
            />

            <motion.div
              className="pointer-events-auto mt-2 flex items-center overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  delay: 0.03,
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                },
              }}
              exit={{
                opacity: 0,
                y: 2,
                transition: {
                  duration: 0.12,
                  ease: 'easeInOut',
                },
              }}
            >
              {isChannelStep && (
                <>
                  <Button
                    size="2xs"
                    variant="secondary"
                    mode="ghost"
                    className="pointer-events-auto gap-1.5 rounded-l-lg rounded-r-none px-2 py-1 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEditContentClick();
                    }}
                  >
                    <RiEdit2Line className="h-3.5 w-3.5" />
                    {isReadOnly ? 'View content' : 'Edit content'}
                  </Button>
                  <div className="h-6 w-px bg-neutral-100" />
                </>
              )}
              {!isReadOnly && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="2xs"
                        variant="secondary"
                        mode="ghost"
                        className="pointer-events-auto gap-1.5 rounded-none px-2 py-1 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsCopyModalOpen(true);
                        }}
                      >
                        <RiFileCopyLine className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Duplicate the current step</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="2xs"
                        variant="secondary"
                        mode="ghost"
                        className={`text-text-sub pointer-events-auto gap-1.5 px-2 py-1 text-xs ${
                          isChannelStep ? 'rounded-l-none rounded-r-lg' : 'rounded-lg'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <RiDeleteBin2Line className="text-error-base h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete step</TooltipContent>
                  </Tooltip>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        open={isCopyModalOpen}
        onOpenChange={setIsCopyModalOpen}
        onConfirm={handleCopyConfirm}
        title="Duplicate step"
        description="Are you sure you want to duplicate this step? A step will be created immediately below the current step."
        confirmButtonText="Duplicate step"
      />

      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        title="Proceeding will delete the step"
        description={
          <>
            You're about to delete the <TruncatedText className="max-w-[32ch] font-bold">{stepName}</TruncatedText>{' '}
            step, this action is permanent.
          </>
        }
        confirmButtonText="Delete"
      />
    </>
  );
};
