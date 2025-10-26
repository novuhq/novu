import { ScheduleDto, SubscriberGlobalPreferenceDto } from '@novu/api/models/components';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { capitalize } from '@/utils/string';
import { cn } from '@/utils/ui';
import { DayScheduleCopy } from './day-schedule-copy';
import { weekDays } from './utils';

const hours = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const formattedHour = displayHour.toString().padStart(2, '0');

  return `${formattedHour}:${minute} ${period}`;
});

type ScheduleTableHeaderProps = {
  children: React.ReactNode;
};

const ScheduleTableHeader = (props: ScheduleTableHeaderProps) => {
  return <div className="flex gap-3">{props.children}</div>;
};

type ScheduleTableHeaderColumnProps = {
  children: React.ReactNode;
  className?: string;
};

const ScheduleTableHeaderColumn = (props: ScheduleTableHeaderColumnProps) => {
  return <div className={cn('text-xs truncate text-start', props.className)}>{props.children}</div>;
};

type ScheduleTableBodyProps = {
  children: React.ReactNode;
};

const ScheduleTableBody = (props: ScheduleTableBodyProps) => {
  return <div className="flex flex-col gap-1">{props.children}</div>;
};

type ScheduleTableRowProps = {
  children: React.ReactNode;
};

const ScheduleTableRow = (props: ScheduleTableRowProps) => {
  return <div className="flex gap-3">{props.children}</div>;
};

type ScheduleTableCellProps = {
  children: React.ReactNode;
  className?: string;
};
const ScheduleBodyColumn = (props: ScheduleTableCellProps) => {
  return <div className={cn('text-xs', props.className)}>{props.children}</div>;
};

type ScheduleTableProps = {
  globalPreference: SubscriberGlobalPreferenceDto;
  onScheduleUpdate: (schedule: ScheduleDto) => Promise<void>;
};

export const ScheduleTable = (props: ScheduleTableProps) => {
  const { globalPreference, onScheduleUpdate } = props;
  const { schedule } = globalPreference;
  const isScheduleDisabled = !schedule?.isEnabled;

  return (
    <div className="flex flex-col gap-1">
      <ScheduleTableHeader>
        <ScheduleTableHeaderColumn className="flex-1">Days</ScheduleTableHeaderColumn>
        <ScheduleTableHeaderColumn className="min-w-[100px]">From</ScheduleTableHeaderColumn>
        <ScheduleTableHeaderColumn className="min-w-[100px]">To</ScheduleTableHeaderColumn>
      </ScheduleTableHeader>
      <ScheduleTableBody>
        {weekDays.map((day) => {
          const isDayDisabled = !schedule?.weeklySchedule?.[day]?.isEnabled;
          const startHour = schedule?.weeklySchedule?.[day]?.hours?.[0]?.start;
          const endHour = schedule?.weeklySchedule?.[day]?.hours?.[0]?.end;

          return (
            <ScheduleTableRow key={day}>
              <ScheduleBodyColumn className="flex-1 flex items-center gap-2">
                <Switch
                  checked={!isDayDisabled}
                  disabled={isScheduleDisabled}
                  onCheckedChange={async (checked) => {
                    try {
                      const updatedWeeklySchedule = {
                        ...schedule?.weeklySchedule,
                        [day]: {
                          ...schedule?.weeklySchedule?.[day],
                          isEnabled: checked,
                          hours: schedule?.weeklySchedule?.[day]?.hours || [{ start: '09:00 AM', end: '05:00 PM' }],
                        },
                      };

                      await onScheduleUpdate({
                        isEnabled: schedule?.isEnabled ?? false,
                        weeklySchedule: updatedWeeklySchedule,
                      });
                    } catch {
                      showErrorToast('Failed to update day schedule. Please try again.');
                    }
                  }}
                />
                <span
                  className={cn('group flex items-center gap-1', {
                    'text-neutral-alpha-500': isScheduleDisabled,
                  })}
                >
                  {capitalize(day)}
                  <DayScheduleCopy
                    day={day}
                    schedule={props.globalPreference.schedule}
                    disabled={isScheduleDisabled}
                    onScheduleUpdate={onScheduleUpdate}
                  />
                </span>
              </ScheduleBodyColumn>
              <ScheduleBodyColumn>
                <Select
                  disabled={isScheduleDisabled || isDayDisabled}
                  value={startHour}
                  onValueChange={async (value) => {
                    try {
                      const updatedWeeklySchedule = {
                        ...schedule?.weeklySchedule,
                        [day]: {
                          ...schedule?.weeklySchedule?.[day],
                          isEnabled: schedule?.weeklySchedule?.[day]?.isEnabled ?? true,
                          hours: [
                            {
                              start: value,
                              end: endHour || '05:00 PM',
                            },
                          ],
                        },
                      };

                      await onScheduleUpdate({
                        isEnabled: schedule?.isEnabled ?? false,
                        weeklySchedule: updatedWeeklySchedule,
                      });
                    } catch {
                      showErrorToast('Failed to update start time. Please try again.');
                    }
                  }}
                >
                  <SelectTrigger
                    size="2xs"
                    className={`shadow-regular-shadow-x-small min-w-[100px] w-full border border-[#E1E4EA]`}
                  >
                    <SelectValue placeholder="-" className="min-w-[100px]" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[100px]">
                    {startHour && !hours.includes(startHour) && (
                      <SelectItem key={startHour} value={startHour} className="text-label-xs">
                        {startHour}
                      </SelectItem>
                    )}
                    {hours.map((value) => (
                      <SelectItem key={value} value={value} className="text-label-xs">
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ScheduleBodyColumn>
              <ScheduleBodyColumn>
                <Select
                  disabled={isScheduleDisabled || isDayDisabled}
                  value={endHour}
                  onValueChange={async (value) => {
                    try {
                      const updatedWeeklySchedule = {
                        ...schedule?.weeklySchedule,
                        [day]: {
                          ...schedule?.weeklySchedule?.[day],
                          isEnabled: schedule?.weeklySchedule?.[day]?.isEnabled ?? true,
                          hours: [
                            {
                              start: schedule?.weeklySchedule?.[day]?.hours?.[0]?.start || '09:00 AM',
                              end: value,
                            },
                          ],
                        },
                      };

                      await onScheduleUpdate({
                        isEnabled: schedule?.isEnabled ?? false,
                        weeklySchedule: updatedWeeklySchedule,
                      });
                    } catch {
                      showErrorToast('Failed to update end time. Please try again.');
                    }
                  }}
                >
                  <SelectTrigger
                    size="2xs"
                    className={`shadow-regular-shadow-x-small min-w-[100px] w-full border border-[#E1E4EA]`}
                  >
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[100px]">
                    {endHour && !hours.includes(endHour) && (
                      <SelectItem key={endHour} value={endHour} className="text-label-xs">
                        {endHour}
                      </SelectItem>
                    )}
                    {hours.map((value) => (
                      <SelectItem key={value} value={value} className="text-label-xs">
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ScheduleBodyColumn>
            </ScheduleTableRow>
          );
        })}
      </ScheduleTableBody>
    </div>
  );
};
