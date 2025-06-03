import { motion } from 'motion/react';
import { RiDeleteBin2Line, RiEditLine } from 'react-icons/ri';
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
      className="absolute right-0 top-[-35px] z-50 -translate-y-full"
    >
      <div className="mb-2 flex items-center gap-1 rounded-lg border border-neutral-200 bg-white shadow-lg">
        {isChannelStep && (
          <>
            <Button
              size="2xs"
              variant="secondary"
              mode="ghost"
              className="gap-1.5 px-2 py-1 text-xs"
              onClick={onEditContentClick}
            >
              <RiEditLine className="h-3.5 w-3.5" />
              Edit content
            </Button>
            <div className="h-4 w-px bg-neutral-200" />
          </>
        )}
        <Button
          size="2xs"
          variant="secondary"
          mode="ghost"
          className="gap-1.5 px-2 py-1 text-xs"
          onClick={onRemoveClick}
        >
          <RiDeleteBin2Line className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
};
