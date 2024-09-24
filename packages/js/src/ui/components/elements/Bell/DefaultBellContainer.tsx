import { Show } from 'solid-js';
import { useStyle } from '../../../helpers';
import { BellIcon } from '../../../icons';

type DefaultBellContainerProps = {
  unreadCount: number;
};

export const BellContainer = (props: DefaultBellContainerProps) => {
  const style = useStyle();

  return (
    <span
      class={style(
        'bellContainer',
        `nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md nt-relative nt-text-foreground nt-cursor-pointer`
      )}
    >
      <BellIcon class={style('bellIcon')} />
      <Show when={props.unreadCount > 0}>
        <span
          class={style(
            'bellDot',
            'nt-absolute nt-top-2 nt-right-2 nt-block nt-size-2 nt-transform nt-translate-x-1/2 -nt-translate-y-1/2 nt-bg-primary nt-rounded-full nt-border nt-border-background'
          )}
        />
      </Show>
    </span>
  );
};
