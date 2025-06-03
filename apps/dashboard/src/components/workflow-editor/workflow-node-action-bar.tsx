import { motion } from 'motion/react';
import { RiDeleteBin2Line, RiEdit2Line, RiFileCopyLine } from 'react-icons/ri';
import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { StepTypeEnum } from '@/utils/enums';
import TruncatedText from '@/components/truncated-text';

const CHANNEL_STEP_TYPES = [
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.IN_APP,
  StepTypeEnum.PUSH,
  StepTypeEnum.CHAT,
];

type WorkflowNodeActionBarProps = {
  stepType: StepTypeEnum;
  stepName: string;
  onRemoveClick: () => void;
  onEditContentClick: () => void;
  onCopyClick: () => void;
};

export const WorkflowNodeActionBar = ({
  stepType,
  stepName,
  onRemoveClick,
  onEditContentClick,
  onCopyClick,
}: WorkflowNodeActionBarProps) => {
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isChannelStep = CHANNEL_STEP_TYPES.includes(stepType);

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
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 300,
            damping: 25,
            mass: 0.6,
          },
        }}
        exit={{
          opacity: 0,
          scale: 0.98,
          y: 2,
          transition: {
            duration: 0.12,
            ease: 'easeIn',
          },
        }}
        className="action-bar-trigger pointer-events-auto absolute bottom-[-42px] right-0 z-50 -translate-y-full"
        style={{
          pointerEvents: 'auto',
          transformOrigin: 'bottom center',
        }}
      >
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{
            scaleY: 1,
            opacity: 1,
            transition: {
              delay: 0.05,
              duration: 0.15,
              ease: 'easeOut',
            },
          }}
          exit={{
            scaleY: 0,
            opacity: 0,
            transition: {
              duration: 0.08,
            },
          }}
          className="absolute bottom-[-12px] left-1/2 h-3 w-[2px] -translate-x-1/2 bg-gradient-to-b from-neutral-200 to-transparent"
          style={{ transformOrigin: 'top center' }}
        />

        <motion.div
          className="pointer-events-auto mb-2 flex items-center overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
          initial={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0)' }}
          animate={{
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transition: {
              delay: 0.08,
              duration: 0.2,
            },
          }}
        >
          {isChannelStep && (
            <>
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: {
                    delay: 0.1,
                    duration: 0.15,
                  },
                }}
              >
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
                  Edit content
                </Button>
              </motion.div>
              <motion.div
                className="h-6 w-px bg-neutral-100"
                initial={{ scaleY: 0 }}
                animate={{
                  scaleY: 1,
                  transition: {
                    delay: 0.12,
                    duration: 0.1,
                  },
                }}
              />
            </>
          )}
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: {
                delay: isChannelStep ? 0.14 : 0.1,
                duration: 0.15,
              },
            }}
          >
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
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: {
                delay: isChannelStep ? 0.16 : 0.12,
                duration: 0.15,
              },
            }}
          >
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
          </motion.div>
        </motion.div>
      </motion.div>

      <ConfirmationModal
        open={isCopyModalOpen}
        onOpenChange={setIsCopyModalOpen}
        onConfirm={handleCopyConfirm}
        title="Copy step"
        description="Are you sure you want to duplicate this step? A step will be created immediately below the current step."
        confirmButtonText="Copy step"
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
