import { motion } from 'motion/react';
import { RiDeleteBin2Line, RiEdit2Line, RiEditLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
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
};

export const WorkflowNodeActionBar = ({ stepType, onRemoveClick, onEditContentClick }: WorkflowNodeActionBarProps) => {
  const isChannelStep = CHANNEL_STEP_TYPES.includes(stepType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.15 }}
      className="action-bar-trigger pointer-events-auto absolute left-[-5px] top-[-118px] z-50 -translate-y-full"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="pointer-events-auto mb-2 flex items-center gap-1 rounded-lg border border-neutral-200 bg-white shadow-lg">
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
      </div>
    </motion.div>
  );
};
