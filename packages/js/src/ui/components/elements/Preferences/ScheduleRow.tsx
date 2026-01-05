import { Accessor, createMemo, createSignal, JSX, Setter } from 'solid-js';
import { Schedule } from '../../../../preferences/schedule';
import { Preference, WeeklySchedule } from '../../../../types';
import { useLocalization } from '../../../context';
import { useStyle } from '../../../helpers/useStyle';
import { ArrowDropDown, CalendarSchedule } from '../../../icons';
import { Info } from '../../../icons/Info';
import { InboxAppearanceCallback } from '../../../types';
import { Collapsible } from '../../primitives/Collapsible';
import { Switch } from '../../primitives/Switch';
import { Tooltip } from '../../primitives/Tooltip';
import { IconRenderer } from '../../shared/IconRendererWrapper';
import { ScheduleTable } from './ScheduleTable';

const ScheduleRowHeader = (props: {
  schedule: Accessor<Schedule | undefined>;
  children: JSX.Element;
  isOpened: Accessor<boolean>;
  setIsOpened: Setter<boolean>;
}) => {
  const style = useStyle();

  return (
    <button
      class={style({
        key: 'scheduleHeader',
        className:
          'nt-flex nt-w-full nt-p-1 nt-justify-between nt-flex-nowrap nt-self-stretch nt-cursor-pointer nt-items-center nt-overflow-hidden',
        context: { schedule: props.schedule() } satisfies Parameters<InboxAppearanceCallback['scheduleHeader']>[0],
      })}
      onClick={() => props.setIsOpened((prev) => !prev)}
      aria-label="Schedule"
      aria-expanded={props.isOpened()}
      data-open={props.isOpened()}
      tabIndex={0}
    >
      {props.children}
    </button>
  );
};

const ScheduleRowLabel = (props: { schedule: Accessor<Schedule | undefined>; isOpened: Accessor<boolean> }) => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <div
      class={style({
        key: 'scheduleLabelContainer',
        className: 'nt-overflow-hidden  nt-flex nt-items-center nt-gap-1 nt-h-3.5',
        context: { schedule: props.schedule() } satisfies Parameters<
          InboxAppearanceCallback['scheduleLabelContainer']
        >[0],
      })}
    >
      <IconRenderer
        iconKey="calendarSchedule"
        class={style({
          key: 'scheduleLabelScheduleIcon',
          className: 'nt-text-foreground-alpha-600 nt-size-3.5',
          context: { schedule: props.schedule() } satisfies Parameters<
            InboxAppearanceCallback['scheduleLabelScheduleIcon']
          >[0],
        })}
        fallback={CalendarSchedule}
      />
      <span
        class={style({
          key: 'scheduleLabel',
          className: 'nt-text-sm nt-font-semibold nt-truncate nt-text-start',
          context: { schedule: props.schedule() } satisfies Parameters<InboxAppearanceCallback['scheduleLabel']>[0],
        })}
        data-open={props.isOpened()}
        data-localization="preferences.schedule.title"
      >
        {t('preferences.schedule.title')}
      </span>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <IconRenderer
            iconKey="info"
            class={style({
              key: 'scheduleLabelInfoIcon',
              className: 'nt-text-foreground-alpha-600 nt-size-3.5',
              context: { schedule: props.schedule() } satisfies Parameters<
                InboxAppearanceCallback['scheduleLabelInfoIcon']
              >[0],
            })}
            fallback={Info}
          />
        </Tooltip.Trigger>
        <Tooltip.Content data-localization="preferences.schedule.headerInfo">
          <div class="nt-max-w-56">{t('preferences.schedule.headerInfo')}</div>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
};

const DEFAULT_HOURS = [{ start: '09:00 AM', end: '05:00 PM' }];
const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: {
    isEnabled: true,
    hours: DEFAULT_HOURS,
  },
  tuesday: {
    isEnabled: true,
    hours: DEFAULT_HOURS,
  },
  wednesday: {
    isEnabled: true,
    hours: DEFAULT_HOURS,
  },
  thursday: {
    isEnabled: true,
    hours: DEFAULT_HOURS,
  },
  friday: {
    isEnabled: true,
    hours: DEFAULT_HOURS,
  },
};

const ScheduleRowActions = (props: {
  schedule: Accessor<Schedule | undefined>;
  isOpened: Accessor<boolean>;
  onChange: (isEnabled: boolean) => void;
}) => {
  const style = useStyle();

  return (
    <div
      class={style({
        key: 'scheduleActionsContainer',
        className: 'nt-flex nt-items-center nt-gap-1',
        context: { schedule: props.schedule() } satisfies Parameters<
          InboxAppearanceCallback['scheduleActionsContainer']
        >[0],
      })}
    >
      <Switch
        state={props.schedule()?.isEnabled ? 'enabled' : 'disabled'}
        onChange={(state) => {
          const isEnabled = state === 'enabled';
          const hasNoWeeklySchedule = !props.schedule()?.weeklySchedule;

          props.schedule()?.update({
            isEnabled,
            ...(isEnabled && hasNoWeeklySchedule && { weeklySchedule: DEFAULT_WEEKLY_SCHEDULE }),
          });

          props.onChange(isEnabled);
        }}
      />
      <span
        class={style({
          key: 'scheduleActionsContainerRight',
          className:
            'nt-text-foreground-alpha-600 nt-transition-all nt-duration-200 data-[open=true]:nt-transform data-[open=true]:nt-rotate-180',
          context: { schedule: props.schedule() } satisfies Parameters<
            InboxAppearanceCallback['scheduleActionsContainerRight']
          >[0],
        })}
        data-open={props.isOpened()}
      >
        <IconRenderer
          iconKey="arrowDropDown"
          class={style({
            key: 'moreTabs__icon',
            className: 'nt-size-4',
          })}
          fallback={ArrowDropDown}
        />
      </span>
    </div>
  );
};

const ScheduleRowBody = (props: { isOpened: Accessor<boolean>; globalPreference: Preference | undefined }) => {
  const style = useStyle();
  const { t } = useLocalization();
  const schedule = createMemo(() => props.globalPreference?.schedule);

  return (
    <div
      class={style({
        key: 'scheduleBody',
        className:
          'nt-flex nt-bg-background nt-border nt-border-neutral-alpha-200 nt-rounded-lg nt-p-2 nt-flex-col nt-gap-2 nt-overflow-hidden',
        context: { schedule: schedule() } satisfies Parameters<InboxAppearanceCallback['scheduleBody']>[0],
      })}
    >
      <span
        class={style({
          key: 'scheduleDescription',
          className: 'nt-text-sm nt-truncate nt-text-start',
          context: { schedule: schedule() } satisfies Parameters<InboxAppearanceCallback['scheduleDescription']>[0],
        })}
        data-localization="preferences.schedule.description"
      >
        {t('preferences.schedule.description')}
      </span>
      <ScheduleTable globalPreference={props.globalPreference} />
      <div
        class={style({
          key: 'scheduleInfoContainer',
          className: 'nt-flex nt-items-start nt-mt-1.5 nt-gap-1',
          context: { schedule: schedule() } satisfies Parameters<InboxAppearanceCallback['scheduleInfoContainer']>[0],
        })}
      >
        <IconRenderer
          iconKey="info"
          class={style({
            key: 'scheduleInfoIcon',
            className: 'nt-size-4',
            context: { schedule: schedule() } satisfies Parameters<InboxAppearanceCallback['scheduleInfoIcon']>[0],
          })}
          fallback={Info}
        />
        <span
          class={style({
            key: 'scheduleInfo',
            className: 'nt-text-sm nt-text-start',
          })}
          data-localization="preferences.schedule.info"
        >
          {t('preferences.schedule.info')}
        </span>
      </div>
    </div>
  );
};

type ScheduleRowProps = {
  globalPreference?: Preference;
};

export const ScheduleRow = (props: ScheduleRowProps) => {
  const style = useStyle();
  const schedule = createMemo(() => props.globalPreference?.schedule);
  const [isOpened, setIsOpened] = createSignal(props.globalPreference?.schedule?.isEnabled ?? false);

  return (
    <>
      <div
        class={style({
          key: 'scheduleContainer',
          className: 'nt-p-1 nt-bg-neutral-alpha-25 nt-rounded-lg nt-border nt-border-neutral-alpha-50',
          context: {
            schedule: schedule(),
          } satisfies Parameters<InboxAppearanceCallback['scheduleContainer']>[0],
        })}
      >
        <ScheduleRowHeader schedule={schedule} isOpened={isOpened} setIsOpened={setIsOpened}>
          <ScheduleRowLabel schedule={schedule} isOpened={isOpened} />
          <ScheduleRowActions schedule={schedule} isOpened={isOpened} onChange={setIsOpened} />
        </ScheduleRowHeader>
        <Collapsible open={isOpened()}>
          <ScheduleRowBody globalPreference={props.globalPreference} isOpened={isOpened} />
        </Collapsible>
      </div>
      <div class="nt-w-full nt-border-t nt-border-neutral-alpha-100" />
    </>
  );
};
