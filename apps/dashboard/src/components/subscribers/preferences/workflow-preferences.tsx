import { PatchPreferenceChannelsDto, SubscriberWorkflowPreferenceDto } from '@novu/api/models/components';
import { ChannelTypeEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiContractUpDownLine, RiExpandUpDownLine } from 'react-icons/ri';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/primitives/card';
import { Step } from '@/components/primitives/step';
import { PreferencesItem } from '@/components/subscribers/preferences/preferences-item';
import { formatDateSimple } from '@/utils/format-date';
import { cn } from '@/utils/ui';
import { STEP_TYPE_TO_COLOR } from '../../../utils/color';

type WorkflowPreferencesProps = {
  workflowPreferences: SubscriberWorkflowPreferenceDto;
  onToggle: (channels: PatchPreferenceChannelsDto, workflowId: string) => void;
  readOnly?: boolean;
};

export function WorkflowPreferences(props: WorkflowPreferencesProps) {
  const { workflowPreferences, onToggle, readOnly = false } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const { workflow, channels } = workflowPreferences;
  return (
    <Card className="border-1 rounded-lg border border-neutral-100 bg-neutral-50 p-1 shadow-none">
      <CardHeader
        className={cn('flex w-full flex-row items-center justify-between p-1 hover:cursor-pointer', {
          'pb-2': isExpanded,
        })}
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
        <CardContent className="space-y-2 rounded-lg bg-white p-2">
          {Object.entries(channels).map(([channel, enabled]) => (
            <PreferencesItem
              key={channel}
              channel={channel as ChannelTypeEnum}
              enabled={enabled}
              onChange={(checked: boolean) => onToggle({ [channel]: checked }, workflow.slug)}
              readOnly={readOnly}
            />
          ))}
        </CardContent>
        <CardFooter className="p-1 pb-0">
          {workflow.updatedAt && (
            <span className="text-2xs py-1 text-neutral-400">
              Updated at{' '}
              {formatDateSimple(workflow.updatedAt, {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC',
              })}{' '}
              UTC
            </span>
          )}
        </CardFooter>
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
