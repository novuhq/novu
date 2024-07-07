import { flip, offset, shift } from '@floating-ui/dom';
import { useFloating, UseFloatingResult } from 'solid-floating-ui';
import { createSignal, JSX, Setter, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useReadAll } from 'src/ui/api';
import { useAppearance } from 'src/ui/context';
import { cn, useStyle } from 'src/ui/helpers';
import { Archived, ArchiveRead, DotsMenu, ReadAll } from '../../icons';

export const MoreActionsDropdown = () => {
  const style = useStyle();
  const { id } = useAppearance();
  const [targetRef, setTargetRef] = createSignal<HTMLButtonElement | null>(null);
  const [contentRef, setContentRef] = createSignal<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = createSignal(false);

  const position = useFloating(targetRef, contentRef, {
    placement: 'bottom',

    middleware: [
      offset(8),
      shift(),
      flip({
        fallbackPlacements: ['bottom', 'top'],
      }),
    ],
  });

  return (
    <>
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
        onClick={() => setIsOpen((prev) => !prev)}
        ref={setTargetRef}
      >
        <DotsMenu />
      </button>
      <Show when={isOpen() && targetRef()}>
        <Portal mount={targetRef() as HTMLElement}>
          <OptionsList ref={setContentRef} position={position} />
        </Portal>
      </Show>
    </>
  );
};

const OptionsList = ({ position, ref }: { ref: Setter<HTMLDivElement | null>; position: UseFloatingResult }) => {
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
        <OptionItem
          label="Mark all as read"
          /**
           * TODO: Implement setFeedOptions and isSelected after Filter is implemented
           */
          onClick={markAllAsRead}
          icon={ReadAll}
        />
        <OptionItem
          label="Archive all"
          /**
           * TODO: Implement onClick after Filter is implemented
           */
          onClick={() => {}}
          icon={Archived}
        />
        <OptionItem
          label="Archive read"
          /**
           * TODO: Implement onClick after Filter is implemented
           */
          onClick={() => {}}
          icon={ArchiveRead}
        />
      </ul>
    </div>
  );
};

const OptionItem = (props: { label: string; onClick: () => void; icon: () => JSX.Element }) => {
  const style = useStyle();
  const { id } = useAppearance();

  return (
    <li>
      <button
        class={style(
          'moreActionsDropdownItem',
          cn(
            id,
            'focus:nt-outline-none nt-flex nt-items-center hover:nt-bg-neutral-alpha-100 nt-py-2 nt-px-3 nt-w-[210px]'
          )
        )}
        onClick={props.onClick}
      >
        <span class="nt-inline-flex nt-gap-2 nt-flex-1 nt-items-center">
          <span class={style('moreActionsDropdownItemLeftIcon', cn(id, ''))}>{props.icon()}</span>
          <span class={style('moreActionsDropdownItemLabel', cn(id, 'nt-text-foreground'))}>{props.label}</span>
        </span>
      </button>
    </li>
  );
};
