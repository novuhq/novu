import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { Step } from '@/components/primitives/step';
import { PreferencesItem } from '@/components/subscribers/preferences/preferences-item';
import { PatchPreferenceChannelsDto, WorkflowPreferenceDto } from '@novu/api/models/components';
import { ChannelTypeEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiContractUpDownLine, RiExpandUpDownLine } from 'react-icons/ri';
import { STEP_TYPE_TO_COLOR } from '../../../utils/color';

type WorkflowPreferencesProps = {
  workflowPreferences: WorkflowPreferenceDto;
  onToggle: (channels: PatchPreferenceChannelsDto, workflowId: string) => void;
  readOnly?: boolean;
};

export function WorkflowPreferences(props: WorkflowPreferencesProps) {
  const { workflowPreferences, onToggle, readOnly = false } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const { workflow, channels } = workflowPreferences;
  return (
    <Card className="border-1 rounded-lg border border-neutral-100 p-1 shadow-none">
      <CardHeader
        className="flex w-full flex-row items-center justify-between bg-white p-1 hover:cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-foreground-600 text-xs">{workflow.name}</span>
        <div className="!mt-0 flex items-center gap-1.5">
          <StepIcons steps={Object.keys(channels) as ChannelTypeEnum[]} />

          {isExpanded ? (
            <RiContractUpDownLine className="text-foreground-400 h-3 w-3" />
          ) : (
            <RiExpandUpDownLine className="text-foreground-400 h-3 w-3" />
          )}
        </div>
      </CardHeader>

      <motion.div
        initial={{
          height: 0,
          opacity: 0,
        }}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{
          height: { duration: 0.2 },
          opacity: { duration: 0.2 },
        }}
        className="overflow-hidden"
      >
        <CardContent className="rounded-lg bg-neutral-50 p-2">
          {Object.entries(channels).map(([channel, enabled]) => (
            <PreferencesItem
              channel={channel as ChannelTypeEnum}
              enabled={enabled}
              onChange={(checked: boolean) => onToggle({ [channel]: checked }, workflow.slug)}
              readOnly={readOnly}
            />
          ))}
        </CardContent>
      </motion.div>
    </Card>
  );
}

function StepIcons({ steps }: { steps: ChannelTypeEnum[] }) {
  return (
    <div className="flex -space-x-2">
      {steps.map((type, index) => {
        const Icon = STEP_TYPE_TO_ICON[type];
        return (
          <Step key={index} variant={STEP_TYPE_TO_COLOR[type]} className="size-6">
            <Icon />
          </Step>
        );
      })}
    </div>
  );
}
