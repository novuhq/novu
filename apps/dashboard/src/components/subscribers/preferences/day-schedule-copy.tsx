import { ScheduleDto } from '@novu/api/models/components';
import { Schedule, WeeklySchedule } from '@novu/shared';
import { useCallback, useMemo, useState } from 'react';
import { RiFileCopyLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Checkbox } from '@/components/primitives/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { capitalize } from '@/utils/string';
import { cn } from '@/utils/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../primitives/tooltip';
import { weekDays } from './utils';

type DayScheduleCopyProps = {
  onScheduleUpdate: (schedule: ScheduleDto) => Promise<void>;
  day: keyof WeeklySchedule;
  schedule?: Schedule | undefined;
  disabled?: boolean;
};

export const DayScheduleCopy = ({ day, schedule, disabled, onScheduleUpdate }: DayScheduleCopyProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedDays, setSelectedDays] = useState<Array<keyof WeeklySchedule>>([day]);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);
  const allWeekDaysSelected = useMemo(() => selectedDays.length === weekDays.length, [selectedDays]);
  const reset = useCallback(() => {
    setSelectedDays([day]);
    setIsAllSelected(false);
    setIsOpen(false);
  }, [day]);
  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        reset();
      } else {
        setIsOpen(isOpen);
      }
    },
    [reset]
  );

  return (
    <Tooltip>
      <TooltipTrigger disabled={disabled}>
        <Popover modal open={isOpen} onOpenChange={onOpenChange}>
          <PopoverTrigger disabled={disabled} className="w-full flex items-center justify-center">
            <RiFileCopyLine
              className={cn(
                'text-foreground-alpha-600 size-3.5 group-hover:opacity-100 opacity-0 transition-opacity duration-200',
                {
                  'group-hover:opacity-0': disabled,
                }
              )}
            />
          </PopoverTrigger>
          <PopoverContent
            side="right"
            sideOffset={0}
            align="center"
            className="rounded-md min-w-[220px] max-w-[220px] p-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <p className="text-sm text-neutral-600 mb-3 text-left">Copy times to:</p>
            <span className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
              <Checkbox
                checked={isAllSelected || allWeekDaysSelected}
                onCheckedChange={(checked) => {
                  if (typeof checked !== 'boolean') return;
                  setIsAllSelected(checked);
                  setSelectedDays(checked ? weekDays : [day]);
                }}
              />
              Select all
            </span>
            {weekDays.map((weekDay) => (
              <span key={weekDay} className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                <Checkbox
                  checked={selectedDays.includes(weekDay) || weekDay === day}
                  onCheckedChange={(value) =>
                    setSelectedDays(value ? [...selectedDays, weekDay] : selectedDays.filter((d) => d !== weekDay))
                  }
                  disabled={weekDay === day}
                />
                {capitalize(weekDay)}
              </span>
            ))}
            <div className="flex justify-end border-t border-neutral-alpha-100 pt-2">
              <Button
                onClick={async () => {
                  const currentDay = day;
                  const daysToCopy = selectedDays.filter((day) => day !== currentDay);
                  const dayToCopy = schedule?.weeklySchedule?.[currentDay];
                  if (dayToCopy) {
                    const updatedWeeklySchedule = {
                      ...schedule?.weeklySchedule,
                      ...daysToCopy.reduce((acc, day) => {
                        acc[day] = dayToCopy;
                        return acc;
                      }, {} as WeeklySchedule),
                    };
                    await onScheduleUpdate({
                      isEnabled: schedule?.isEnabled ?? false,
                      weeklySchedule: updatedWeeklySchedule,
                    });
                  }
                  reset();
                }}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </TooltipTrigger>
      <TooltipContent>Copy times to</TooltipContent>
    </Tooltip>
  );
};
