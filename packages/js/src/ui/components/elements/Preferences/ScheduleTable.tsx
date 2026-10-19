import { createMemo, Index, JSX } from 'solid-js';
import { Schedule } from '../../../../preferences';
import { Preference } from '../../../../preferences/preference';
import { useLocalization } from '../../../../ui/context/LocalizationContext';
import { cn } from '../../../../ui/helpers';
import { useStyle } from '../../../../ui/helpers/useStyle';
import { InboxAppearanceCallback } from '../../../../ui/types';
import { TimeSelect } from '../../primitives';
import { Switch } from '../../primitives/Switch';
import { DayScheduleCopy } from './DayScheduleCopy';
import { weekDays } from './utils';

type ScheduleTableHeaderProps = {
  schedule?: Schedule;
  children: JSX.Element;
};

const ScheduleTableHeader = (props: ScheduleTableHeaderProps) => {
  const style = useStyle();
  return (
    <div
      class={style({
        key: 'scheduleTableHeader',
        className: 'nt-flex nt-gap-3',
        context: { schedule: props.schedule } satisfies Parameters<InboxAppearanceCallback['scheduleTableHeader']>[0],
      })}
    >
      {props.children}
    </div>
  );
};

type ScheduleTableHeaderColumnProps = {
  schedule?: Schedule;
  children: JSX.Element;
  class?: string;
  dataLocalization?: string;
};

const ScheduleTableHeaderColumn = (props: ScheduleTableHeaderColumnProps) => {
  const style = useStyle();
  return (
    <div
      class={style({
        key: 'scheduleHeaderColumn',
        className: cn('nt-text-sm nt-truncate nt-text-start', props.class),
        context: { schedule: props.schedule } satisfies Parameters<InboxAppearanceCallback['scheduleHeaderColumn']>[0],
      })}
      data-localization={props.dataLocalization}
    >
      {props.children}
    </div>
  );
};

type ScheduleTableBodyProps = {
  schedule?: Schedule;
  children: JSX.Element;
};

const ScheduleTableBody = (props: ScheduleTableBodyProps) => {
  const style = useStyle();
  return (
    <div
      class={style({
        key: 'scheduleTableBody',
        className: 'nt-flex nt-flex-col nt-gap-1',
        context: { schedule: props.schedule } satisfies Parameters<InboxAppearanceCallback['scheduleTableBody']>[0],
      })}
    >
      {props.children}
    </div>
  );
};

type ScheduleTableRowProps = {
  schedule?: Schedule;
  children: JSX.Element;
};

const ScheduleTableRow = (props: ScheduleTableRowProps) => {
  const style = useStyle();
  return (
    <div
      class={style({
        key: 'scheduleBodyRow',
        className: 'nt-flex nt-gap-3',
        context: { schedule: props.schedule } satisfies Parameters<InboxAppearanceCallback['scheduleBodyRow']>[0],
      })}
    >
      {props.children}
    </div>
  );
};

type ScheduleTableCellProps = {
  schedule?: Schedule;
  children: JSX.Element;
  class?: string;
};
const ScheduleBodyColumn = (props: ScheduleTableCellProps) => {
  const style = useStyle();
  return (
    <div
      class={style({
        key: 'scheduleBodyColumn',
        className: cn('nt-text-sm', props.class),
        context: { schedule: props.schedule } satisfies Parameters<InboxAppearanceCallback['scheduleBodyColumn']>[0],
      })}
    >
      {props.children}
    </div>
  );
};

type ScheduleTableProps = {
  globalPreference?: Preference;
};

export const ScheduleTable = (props: ScheduleTableProps) => {
  const style = useStyle();
  const { t } = useLocalization();
  const isScheduleDisabled = createMemo(() => !props.globalPreference?.schedule?.isEnabled);
  const schedule = createMemo(() => props.globalPreference?.schedule);

  return (
    <div
      class={style({
        key: 'scheduleTable',
        className: 'nt-flex nt-flex-col nt-gap-1',
        context: { schedule: schedule() } satisfies Parameters<InboxAppearanceCallback['scheduleTable']>[0],
      })}
    >
      <ScheduleTableHeader schedule={schedule()}>
        <ScheduleTableHeaderColumn schedule={schedule()} class="nt-flex-1" dataLocalization="preferences.schedule.days">
          {t('preferences.schedule.days')}
        </ScheduleTableHeaderColumn>
        <ScheduleTableHeaderColumn
          schedule={schedule()}
          class="nt-min-w-[74px]"
          dataLocalization="preferences.schedule.from"
        >
          {t('preferences.schedule.from')}
        </ScheduleTableHeaderColumn>
        <ScheduleTableHeaderColumn
          schedule={schedule()}
          class="nt-min-w-[74px]"
          dataLocalization="preferences.schedule.to"
        >
          {t('preferences.schedule.to')}
        </ScheduleTableHeaderColumn>
      </ScheduleTableHeader>
      <ScheduleTableBody schedule={schedule()}>
        <Index each={weekDays}>
          {(day) => {
            const isDayDisabled = createMemo(() => !schedule()?.weeklySchedule?.[day()]?.isEnabled);

            return (
              <ScheduleTableRow schedule={schedule()}>
                <ScheduleBodyColumn schedule={schedule()} class="nt-flex-1 nt-flex nt-items-center nt-gap-2">
                  <Switch
                    state={isDayDisabled() ? 'disabled' : 'enabled'}
                    onChange={(state) => {
                      const isEnabled = state === 'enabled';
                      const hasNoHours = (schedule()?.weeklySchedule?.[day()]?.hours?.length ?? 0) === 0;

                      schedule()?.update({
                        weeklySchedule: {
                          ...schedule()?.weeklySchedule,
                          [day()]: {
                            ...schedule()?.weeklySchedule?.[day()],
                            isEnabled,
                            ...(hasNoHours && { hours: [{ start: '09:00 AM', end: '05:00 PM' }] }),
                          },
                        },
                      });
                    }}
                    disabled={isScheduleDisabled()}
                  />
                  <span
                    class={cn('nt-group nt-flex nt-items-center nt-gap-1', {
                      'nt-text-neutral-alpha-500': isScheduleDisabled(),
                    })}
                    data-localization={`preferences.schedule.${day()}`}
                  >
                    {t(`preferences.schedule.${day()}`)}
                    <DayScheduleCopy day={day} schedule={schedule} disabled={isScheduleDisabled()} />
                  </span>
                </ScheduleBodyColumn>
                <ScheduleBodyColumn schedule={schedule()}>
                  <TimeSelect
                    disabled={isScheduleDisabled() || isDayDisabled()}
                    value={schedule()?.weeklySchedule?.[day()]?.hours?.[0]?.start}
                    onChange={(value) => {
                      schedule()?.update({
                        weeklySchedule: {
                          ...schedule()?.weeklySchedule,
                          [day()]: {
                            ...schedule()?.weeklySchedule?.[day()],
                            hours: [
                              {
                                start: value,
                                end: schedule()?.weeklySchedule?.[day()]?.hours?.[0]?.end,
                              },
                            ],
                          },
                        },
                      });
                    }}
                  />
                </ScheduleBodyColumn>
                <ScheduleBodyColumn schedule={schedule()}>
                  <TimeSelect
                    disabled={isScheduleDisabled() || isDayDisabled()}
                    value={schedule()?.weeklySchedule?.[day()]?.hours?.[0]?.end}
                    onChange={(value) => {
                      schedule()?.update({
                        weeklySchedule: {
                          ...schedule()?.weeklySchedule,
                          [day()]: {
                            ...schedule()?.weeklySchedule?.[day()],
                            hours: [
                              {
                                start: schedule()?.weeklySchedule?.[day()]?.hours?.[0]?.start,
                                end: value,
                              },
                            ],
                          },
                        },
                      });
                    }}
                  />
                </ScheduleBodyColumn>
              </ScheduleTableRow>
            );
          }}
        </Index>
      </ScheduleTableBody>
    </div>
  );
};
