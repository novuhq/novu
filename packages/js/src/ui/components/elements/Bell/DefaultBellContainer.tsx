import { Show } from 'solid-js';
import { useStyle } from '../../../helpers';
import { Bell as DefaultBell } from '../../../icons';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

type DefaultBellContainerProps = {
  unreadCount: number;
};

export const BellContainer = (props: DefaultBellContainerProps) => {
  const style = useStyle();
  const bellIconStyle = style('bellIcon', 'nt-size-4');

  return (
    <span
      class={style(
        'bellContainer',
        `nt-size-4 nt-flex nt-justify-center nt-items-center nt-relative nt-text-foreground nt-cursor-pointer`
      )}
    >
      <IconRendererWrapper iconKey="bell" class={bellIconStyle} fallback={<DefaultBell class={bellIconStyle} />} />
      <Show when={props.unreadCount > 0}>
        <span
          class={style(
            'bellDot',
            'nt-absolute nt-top-0 nt-right-0 nt-block nt-size-2 nt-transform nt-bg-counter nt-rounded-full nt-border nt-border-background'
          )}
        />
      </Show>
    </span>
  );
};
