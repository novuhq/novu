import { flip, offset, shift } from '@floating-ui/dom';
import { useFloating, UseFloatingResult } from 'solid-floating-ui';
import { createSignal, JSX, Setter, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useReadAll } from 'src/ui/api';
import { useAppearance } from 'src/ui/context';
import { cn, useStyle } from 'src/ui/helpers';
import { Archived, ArchiveRead, DotsMenu, ReadAll } from '../../icons';
import { Dropdown, DropdownItem } from '../common';

const APPEARANCE_KEY_PREFIX = 'moreActions';

export const MoreActionsDropdown = () => {
  const style = useStyle();
  const { id } = useAppearance();

  return (
    <Dropdown
      renderTrigger={() => (
        <button
          class={style(
            'moreActionsDropdownTrigger',
            cn(
              id,
              `nt-h-6 nt-w-6 nt-flex nt-justify-center
        nt-items-center nt-rounded-md nt-relative
        hover:nt-bg-foreground-alpha-50
        focus:nt-bg-foreground-alpha-50
        nt-text-foreground-alpha-600`
            )
          )}
        >
          <DotsMenu />
        </button>
      )}
      renderContent={({ position, ref }) => <OptionsList position={position} ref={ref} />}
    />
  );
};

const OptionsList = ({ position, ref }: { ref: Setter<HTMLElement | null>; position: UseFloatingResult }) => {
  const style = useStyle();
  const { id } = useAppearance();

  const { markAllAsRead } = useReadAll();

  return (
    <div
      ref={ref}
      style={{
        position: position.strategy,
        top: `${position.y ?? 0}px`,
        left: `${position.x ?? 0}px`,
      }}
      class={style(
        'moreActionsDropdownContent',
        cn(id, 'nt-w-max nt-rounded-lg nt-shadow-[0_5px_20px_0_rgba(0,0,0,0.20)] nt-z-10 nt-bg-background nt-py-2')
      )}
    >
      <ul class="nt-list-none">
        <DropdownItem
          label="Mark all as read"
          /**
           * TODO: Implement setFeedOptions and isSelected after Filter is implemented
           */
          onClick={markAllAsRead}
          icon={ReadAll}
          appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
        />
        <DropdownItem
          label="Archive all"
          /**
           * TODO: Implement onClick after Filter is implemented
           */
          onClick={() => {}}
          icon={Archived}
          appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
        />
        <DropdownItem
          label="Archive read"
          /**
           * TODO: Implement onClick after Filter is implemented
           */
          onClick={() => {}}
          icon={ArchiveRead}
          appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
        />
      </ul>
    </div>
  );
};
