import { cn, useStyle } from '../../../helpers';
import { StatusDropdown } from '../InboxStatus/InboxStatusDropdown';
import { ActionsContainer } from './ActionsContainer';

type HeaderProps = {
  navigateToPreferences?: () => void;
};

export const Header = (props: HeaderProps) => {
  const style = useStyle();

  return (
    <div
      class={style(
        'inboxHeader',
        cn(
          'nt-flex nt-bg-neutral-alpha-25 nt-shrink-0 nt-justify-between nt-items-center nt-w-full nt-pb-2 nt-pt-2.5 nt-px-4'
        )
      )}
    >
      <StatusDropdown />
      <ActionsContainer showPreferences={props.navigateToPreferences} />
    </div>
  );
};
