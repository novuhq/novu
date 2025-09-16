import { SubscriberGlobalPreferenceDto } from '@novu/api/models/components';
import { motion } from 'motion/react';
import { useState } from 'react';
import {
  RiCalendarScheduleLine,
  RiContractUpDownLine,
  RiExpandUpDownLine,
  RiInformationLine,
  RiLoader4Line,
} from 'react-icons/ri';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useOptimisticScheduleUpdate } from '@/hooks/use-optimistic-schedule-update';
import { cn } from '@/utils/ui';
import { ScheduleTable } from './schedule-table';

type SubscribersScheduleProps = {
  globalPreference: SubscriberGlobalPreferenceDto;
  subscriberId: string;
};

export const SubscribersSchedule = (props: SubscribersScheduleProps) => {
  const { globalPreference, subscriberId } = props;
  const [isExpanded, setIsExpanded] = useState(false);

  const { updateSchedule, isPending } = useOptimisticScheduleUpdate({
    subscriberId,
    onError: () => {
      showErrorToast('Failed to update schedule. Please try again.');
    },
  });
  return (
    <Card className="border-1 rounded-lg border border-neutral-100 bg-neutral-50 p-1 shadow-none">
      <CardHeader
        className={cn('flex w-full flex-row items-center justify-between p-1 hover:cursor-pointer', {
          'pb-2': isExpanded,
        })}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
          <RiCalendarScheduleLine className="text-foreground-400 size-3" />
          <span className="text-foreground-600 text-xs">Subscriber's schedule</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-foreground-400 inline-block hover:cursor-help">
                <RiInformationLine className="size-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Set subscriber schedule. External notification channels are paused outside this time, except inbox and
              critical ones.
            </TooltipContent>
          </Tooltip>
          {isPending && <RiLoader4Line className="size-3 animate-spin text-neutral-400" />}
        </div>
        <div
          className="!mt-0 flex items-center gap-1.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Switch
            checked={globalPreference.schedule?.isEnabled}
            onCheckedChange={async (checked) => {
              try {
                await updateSchedule({
                  isEnabled: checked,
                  weeklySchedule: globalPreference.schedule?.weeklySchedule,
                });
              } catch {
                showErrorToast('Failed to update schedule. Please try again.');
              }
            }}
          />

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
          <span className="text-label-xs text-text-sub text-start">Allow notifications between:</span>
          <ScheduleTable
            globalPreference={globalPreference}
            onScheduleUpdate={async (schedule) => {
              await updateSchedule(schedule);
            }}
          />
          <div className="flex items-center mt-2.5 gap-1 text-text-soft">
            <RiInformationLine className="size-4" />
            <span className="text-label-xs">
              Critical and In-app notifications still reach you outside your schedule.
            </span>
          </div>
        </CardContent>
      </motion.div>
    </Card>
  );
};
