import { Accessor, createEffect, createMemo, createSignal, createUniqueId, For } from 'solid-js';
import { Schedule } from '../../../../preferences';
import { WeeklySchedule } from '../../../../types';
import { useLocalization } from '../../../../ui/context/LocalizationContext';
import { cn } from '../../../../ui/helpers';
import { useStyle } from '../../../../ui/helpers/useStyle';
import { Copy } from '../../../../ui/icons';
import { InboxAppearanceCallback } from '../../../../ui/types';
import { Button, Checkbox, Dropdown } from '../../primitives';
import { Tooltip } from '../../primitives/Tooltip';
import { IconRenderer } from '../../shared/IconRendererWrapper';
import { weekDays } from './utils';

const NOVU_EVENT_CLOSE_DAY_SCHEDULE_COPY_COMPONENT = 'novu.close-day-schedule-copy-component';

type DayScheduleCopyProps = {
  day: Accessor<keyof WeeklySchedule>;
  schedule: Accessor<Schedule | undefined>;
  disabled?: boolean;
};

export const DayScheduleCopy = (props: DayScheduleCopyProps) => {
  const id = createUniqueId();
  const style = useStyle();
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = createSignal<boolean>(false);
  const [selectedDays, setSelectedDays] = createSignal<Array<keyof WeeklySchedule>>([props.day()]);
  const [isAllSelected, setIsAllSelected] = createSignal<boolean>(false);
  const allWeekDaysSelected = createMemo(() => selectedDays().length === weekDays.length);
  const reset = () => {
    setSelectedDays([props.day()]);
    setIsAllSelected(false);
    setIsOpen(false);
  };
  const onOpenChange = createMemo(() => (isOpen: boolean) => {
    if (isOpen) {
      // close other copy times to dropdowns
      document.dispatchEvent(new CustomEvent(NOVU_EVENT_CLOSE_DAY_SCHEDULE_COPY_COMPONENT, { detail: { id } }));
    }
    setTimeout(() => {
      // set is open after a short delay to ensure nicer animation
      if (!isOpen) {
        reset();
      } else {
        setIsOpen(isOpen);
      }
    }, 50);
  });

  createEffect(() => {
    const listener = (event: CustomEvent<{ id: string }>) => {
      const data = event.detail;
      if (data.id !== id) {
        reset();
      }
    };

    // @ts-expect-error custom event
    document.addEventListener(NOVU_EVENT_CLOSE_DAY_SCHEDULE_COPY_COMPONENT, listener);

    return () => {
      // @ts-expect-error custom event
      document.removeEventListener(NOVU_EVENT_CLOSE_DAY_SCHEDULE_COPY_COMPONENT, listener);
    };
  });

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        disabled={props.disabled}
        asChild={(childProps) => (
          <Dropdown.Root placement="right" offset={0} open={isOpen()} onOpenChange={onOpenChange()}>
            <Dropdown.Trigger
              disabled={props.disabled}
              class={style({
                key: 'dayScheduleCopy__dropdownTrigger',
                className: 'nt-w-full',
              })}
            >
              <Button size="iconSm" variant="ghost" {...childProps}>
                <IconRenderer
                  iconKey="copy"
                  class={style({
                    key: 'dayScheduleCopyIcon',
                    className: cn(
                      'nt-text-foreground-alpha-600 nt-size-3.5 group-hover:nt-opacity-100 nt-opacity-0 nt-transition-opacity nt-duration-200',
                      {
                        'group-hover:nt-opacity-0': props.disabled,
                      }
                    ),
                    context: { schedule: props.schedule() } satisfies Parameters<
                      InboxAppearanceCallback['dayScheduleCopyIcon']
                    >[0],
                  })}
                  fallback={Copy}
                />
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content
              portal
              appearanceKey="dayScheduleCopy__dropdownContent"
              class="nt-rounded-md nt-min-w-[220px] nt-max-w-[220px] nt-p-1"
            >
              <span
                class={style({
                  key: 'dayScheduleCopyTitle',
                  className: 'nt-text-sm nt-text-neutral-600  nt-mb-3 nt-text-left',
                  context: { schedule: props.schedule() } satisfies Parameters<
                    InboxAppearanceCallback['dayScheduleCopyTitle']
                  >[0],
                })}
                data-localization="preferences.schedule.dayScheduleCopy.title"
              >
                {t('preferences.schedule.dayScheduleCopy.title')}
              </span>
              <span
                class={style({
                  key: 'dayScheduleCopySelectAll',
                  className: 'nt-flex nt-items-center nt-gap-2 nt-text-sm nt-text-neutral-600 nt-mb-2',
                  context: { schedule: props.schedule() } satisfies Parameters<
                    InboxAppearanceCallback['dayScheduleCopySelectAll']
                  >[0],
                })}
                data-localization="preferences.schedule.dayScheduleCopy.selectAll"
              >
                <Checkbox
                  checked={isAllSelected() || allWeekDaysSelected()}
                  onChange={(checked) => {
                    setIsAllSelected(checked);
                    setSelectedDays(checked ? weekDays : [props.day()]);
                  }}
                />
                {t('preferences.schedule.dayScheduleCopy.selectAll')}
              </span>
              <For each={weekDays}>
                {(day) => (
                  <span
                    class={style({
                      key: 'dayScheduleCopyDay',
                      className: 'nt-flex nt-items-center nt-gap-2 nt-text-sm nt-text-neutral-600 nt-mb-2',
                      context: { schedule: props.schedule() } satisfies Parameters<
                        InboxAppearanceCallback['dayScheduleCopyDay']
                      >[0],
                    })}
                    data-localization={`preferences.schedule.${day}`}
                  >
                    <Checkbox
                      value={'checked'}
                      onChange={(value) =>
                        setSelectedDays(value ? [...selectedDays(), day] : selectedDays().filter((d) => d !== day))
                      }
                      checked={selectedDays().includes(day) || day === props.day()}
                      disabled={day === props.day()}
                    />
                    {t(`preferences.schedule.${day}`)}
                  </span>
                )}
              </For>
              <div
                class={style({
                  key: 'dayScheduleCopyFooterContainer',
                  className: 'nt-flex nt-justify-end nt-border-t nt-border-neutral-alpha-100 nt-pt-2',
                  context: { schedule: props.schedule() } satisfies Parameters<
                    InboxAppearanceCallback['dayScheduleCopyFooterContainer']
                  >[0],
                })}
              >
                <Button
                  onClick={() => {
                    const currentDay = props.day();
                    const daysToCopy = selectedDays().filter((day) => day !== currentDay);
                    const dayToCopy = props.schedule()?.weeklySchedule?.[currentDay];
                    if (dayToCopy) {
                      props.schedule()?.update({
                        weeklySchedule: {
                          ...props.schedule()?.weeklySchedule,
                          ...daysToCopy.reduce((acc, day) => {
                            acc[day] = dayToCopy;
                            return acc;
                          }, {} as WeeklySchedule),
                        },
                      });
                    }
                    reset();
                  }}
                  data-localization="preferences.schedule.dayScheduleCopy.apply"
                >
                  {t('preferences.schedule.dayScheduleCopy.apply')}
                </Button>
              </div>
            </Dropdown.Content>
          </Dropdown.Root>
        )}
      />
      <Tooltip.Content data-localization="preferences.schedule.copyTimesTo">
        {t('preferences.schedule.copyTimesTo')}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};
