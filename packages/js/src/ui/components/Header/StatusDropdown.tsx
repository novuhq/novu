import { flip, offset, shift } from '@floating-ui/dom';
import { useFloating, UseFloatingResult } from 'solid-floating-ui';
import { createSignal, JSX, Setter, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { FetchFeedArgs } from 'src/feeds';
import { NotificationStatus } from 'src/types';
import { useAppearance, useFeedsContext } from 'src/ui/context';
import { cn, useStyle } from 'src/ui/helpers';
import { Archived, ArrowDropDown, Check, Inbox, Unread } from '../../icons';

const DropdownStatus = {
  UnreadRead: 'Unread & read',
  Unread: 'Unread only',
  Archived: 'Archived',
};

/**
 *
 * TODO: Implement getStatusLabel after Filter is implemented
 * currently, it is a placeholder function
 */
const getStatusLabel = (status?: NotificationStatus) => {
  switch (status) {
    case NotificationStatus.UNREAD:
      return 'Inbox';
    case NotificationStatus.UNSEEN:
      return 'Unread';
    case NotificationStatus.SEEN:
      return 'Archived';
    default:
      return 'Inbox';
  }
};

export const StatusDropdown = () => {
  const style = useStyle();
  const { id } = useAppearance();
  const [targetRef, setTargetRef] = createSignal<HTMLButtonElement | null>(null);
  const [contentRef, setContentRef] = createSignal<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = createSignal(false);

  const { setFeedOptions, feedOptions } = useFeedsContext();

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
          'inboxStatusDropdownTrigger',
          cn(id, 'focus:nt-outline-none nt-flex nt-items-center nt-gap-2 nt-relative')
        )}
        ref={setTargetRef}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span class={style('inboxStatusTitle', cn(id, 'nt-text-xl nt-font-semibold nt-text-foreground'))}>
          {getStatusLabel(feedOptions.status)}
        </span>
        <span>
          <ArrowDropDown />
        </span>
      </button>
      <Show when={isOpen() && targetRef()}>
        <Portal mount={targetRef() as HTMLElement}>
          <StatusOptions ref={setContentRef} position={position} setFeedOptions={setFeedOptions} />
        </Portal>
      </Show>
    </>
  );
};

const StatusOptions = ({
  position,
  ref,
  setFeedOptions,
}: {
  ref: Setter<HTMLDivElement | null>;
  position: UseFloatingResult;
  setFeedOptions: (options: FetchFeedArgs) => void;
}) => {
  const style = useStyle();
  const { id } = useAppearance();

  return (
    <div
      ref={ref}
      style={{
        position: position.strategy,
        top: `${position.y ?? 0}px`,
        left: `${position.x ?? 0}px`,
      }}
      class={style(
        'inboxStatusDropdownContent',
        cn(id, 'nt-w-max nt-rounded-lg nt-shadow-[0_5px_20px_0_rgba(0,0,0,0.20)] nt-z-10 nt-bg-background nt-py-2')
      )}
    >
      <ul class="nt-list-none">
        <Statusitem
          label={DropdownStatus.UnreadRead}
          /**
           * TODO: Implement setFeedOptions and isSelected after Filter is implemented
           */
          onClick={() => {
            setFeedOptions({ status: NotificationStatus.UNREAD });
          }}
          isSelected={true}
          icon={Inbox}
        />
        <Statusitem
          label={DropdownStatus.Unread}
          onClick={() => {
            /**
             * TODO: Implement setFeedOptions after Filter is implemented
             */
            setFeedOptions({ status: NotificationStatus.UNSEEN });
          }}
          isSelected={false}
          icon={Unread}
        />
        <Statusitem
          label={DropdownStatus.Archived}
          onClick={() => {
            /**
             * TODO: Implement setFeedOptions after Filter is implemented
             */
            setFeedOptions({ status: NotificationStatus.SEEN });
          }}
          isSelected={false}
          icon={Archived}
        />
      </ul>
    </div>
  );
};

const Statusitem = (props: { label: string; onClick: () => void; isSelected?: boolean; icon: () => JSX.Element }) => {
  const style = useStyle();
  const { id } = useAppearance();

  return (
    <li>
      <button
        class={style(
          'inboxStatusDropdownItem',
          cn(
            id,
            'focus:nt-outline-none nt-flex nt-items-center nt-justify-between hover:nt-bg-neutral-alpha-100 nt-py-1 nt-px-3 nt-w-[210px]'
          )
        )}
        onClick={props.onClick}
      >
        <span class="nt-inline-flex nt-gap-2 nt-flex-1 nt-items-center">
          <span class={style('inboxStatusDropdownItemLeftIcon', cn(id, ''))}>{props.icon()}</span>
          <span class={style('inboxStatusDropdownItemLabel', cn(id, 'nt-text-foreground'))}>{props.label}</span>
        </span>
        <Show when={props.isSelected}>
          <span class={style('inboxStatusDropdownItemRightIcon', cn(id, ''))}>
            <Check />
          </span>
        </Show>
      </button>
    </li>
  );
};
