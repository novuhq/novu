import { motion } from 'motion/react';
import { RiDeleteBin2Line, RiEdit2Line, RiFileCopyLine } from 'react-icons/ri';
import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { StepTypeEnum } from '@/utils/enums';

const CHANNEL_STEP_TYPES = [
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.IN_APP,
  StepTypeEnum.PUSH,
  StepTypeEnum.CHAT,
];

type WorkflowNodeActionBarProps = {
  stepType: StepTypeEnum;
  onRemoveClick: () => void;
  onEditContentClick: () => void;
  onCopyClick: () => void;
};

export const WorkflowNodeActionBar = ({
  stepType,
  onRemoveClick,
  onEditContentClick,
  onCopyClick,
}: WorkflowNodeActionBarProps) => {
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const isChannelStep = CHANNEL_STEP_TYPES.includes(stepType);

  const handleCopyConfirm = () => {
    onCopyClick();
    setIsCopyModalOpen(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{ duration: 0.15 }}
        className="action-bar-trigger pointer-events-auto absolute left-[-5px] top-[-118px] z-50 -translate-y-full"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="pointer-events-auto mb-2 flex items-center rounded-lg border border-neutral-200 bg-white shadow-lg">
          {isChannelStep && (
            <>
              <Button
                size="2xs"
                variant="secondary"
                mode="ghost"
                className="pointer-events-auto gap-1.5 px-2 py-1 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEditContentClick();
                }}
              >
                <RiEdit2Line className="h-3.5 w-3.5" />
                Edit content
              </Button>
              <div className="h-6 w-px bg-neutral-100" />
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="2xs"
                variant="secondary"
                mode="ghost"
                className="pointer-events-auto gap-1.5 px-2 py-1 text-xs"
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
                className="text-text-sub pointer-events-auto gap-1.5 rounded-[7px] px-2 py-1 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveClick();
                }}
              >
                <RiDeleteBin2Line className="text-error-base h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete step</TooltipContent>
          </Tooltip>
        </div>
      </motion.div>

      <ConfirmationModal
        open={isCopyModalOpen}
        onOpenChange={setIsCopyModalOpen}
        onConfirm={handleCopyConfirm}
        title="Copy step"
        description="Are you sure you want to duplicate this step? A step will be created immediately below the current step."
        confirmButtonText="Copy step"
      />
    </>
  );
};
