import { JSX, Show } from 'solid-js';
import { useAppearance } from '../../../context';
import { AppearanceKey, cn, useStyle } from '../../../helpers';
import { Check } from '../../../icons';

export const DropdownItem = (props: {
  label: string;
  onClick: () => void;
  isSelected?: boolean;
  icon: () => JSX.Element;
  appearanceKeyPrefix: string;
}) => {
  const style = useStyle();
  const { id } = useAppearance();

  return (
    <div>
      <button
        class={style(
          `${props.appearanceKeyPrefix}DropdownItem` as AppearanceKey,
          cn(
            id,
            'focus:nt-outdivne-none nt-flex nt-items-center nt-justify-between hover:nt-bg-neutral-alpha-100 nt-py-1 nt-px-3 nt-w-[210px]'
          )
        )}
        onClick={props.onClick}
      >
        <span class="nt-inline-flex nt-gap-2 nt-flex-1 nt-items-center">
          <span class={style(`${props.appearanceKeyPrefix}DropdownItemLeftIcon` as AppearanceKey, cn(id, ''))}>
            {props.icon()}
          </span>
          <span
            class={style(
              `${props.appearanceKeyPrefix}DropdownItemLabel` as AppearanceKey,
              cn(id, 'nt-text-foreground')
            )}
          >
            {props.label}
          </span>
        </span>
        <Show when={props.isSelected}>
          <span class={style(`${props.appearanceKeyPrefix}DropdownItemRightIcon` as AppearanceKey, cn(id, ''))}>
            <Check />
          </span>
        </Show>
      </button>
    </div>
  );
};
