import { createMemo, For, Show } from 'solid-js';
import { cn } from '../../../ui/helpers';
import { useStyle } from '../../../ui/helpers/useStyle';
import { Check } from '../../../ui/icons';
import { Dropdown, dropdownItemVariants } from '../primitives';
import { inputVariants } from '../primitives/Input';
import { IconRenderer } from '../shared/IconRendererWrapper';

type TimeSelectProps = {
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

const hours = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const formattedHour = displayHour.toString().padStart(2, '0');

  return `${formattedHour}:${minute} ${period}`;
});

type TimeSelectItemProps = {
  hour: string;
  isSelected: boolean;
  onClick: () => void;
};

const TimeSelectItem = (props: TimeSelectItemProps) => {
  const style = useStyle();

  return (
    <Dropdown.Item
      class={style({
        key: 'timeSelect__dropdownItem',
        className: cn(dropdownItemVariants(), 'nt-flex nt-gap-2 nt-justify-between'),
      })}
      onClick={props.onClick}
    >
      <span class="nt-text-sm">{props.hour}</span>
      <Show when={props.isSelected}>
        <IconRenderer
          iconKey="check"
          class={style({
            key: 'timeSelect__dropdownItemCheck__icon',
            className: 'nt-size-2.5 -nt-mt-[2px]',
            iconKey: 'check',
          })}
          fallback={Check}
        />
      </Show>
    </Dropdown.Item>
  );
};

export const TimeSelect = (props: TimeSelectProps) => {
  const style = useStyle();
  const time = createMemo(() => props.value?.split(' ')[0]);
  const amPm = createMemo(() => {
    if (!time()) return '';

    return props.value?.split(' ')[1] === 'PM' ? 'PM' : 'AM';
  });

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        disabled={props.disabled}
        class={style({
          key: 'timeSelect__dropdownTrigger',
          className: 'nt-w-full',
        })}
      >
        <span
          class={style({
            key: 'timeSelect__time',
            className: cn(
              inputVariants({ size: 'xs', variant: 'default' }),
              'nt-min-w-[74px] nt-flex nt-px-2 nt-py-1.5 nt-items-center nt-justify-between nt-w-full nt-text-sm',
              {
                'nt-justify-center nt-text-neutral-alpha-500': props.disabled || !time(),
              }
            ),
          })}
        >
          <span>{time() ?? '-'}</span>
          {amPm() && <span>{amPm()}</span>}
        </span>
      </Dropdown.Trigger>
      <Dropdown.Content
        portal
        appearanceKey="timeSelect__dropdownContent"
        class="-nt-mt-2 nt-rounded-md nt-min-w-[120px] nt-max-w-[120px] nt-max-h-[160px] nt-overflow-y-auto"
      >
        <For each={hours}>
          {(hour) => (
            <TimeSelectItem hour={hour} isSelected={props.value === hour} onClick={() => props.onChange?.(hour)} />
          )}
        </For>
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
