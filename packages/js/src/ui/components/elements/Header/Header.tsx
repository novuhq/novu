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
        cn('nt-flex nt-shrink-0 nt-justify-between nt-items-center nt-w-full nt-py-5 nt-px-6')
      )}
    >
      <StatusDropdown />
      <ActionsContainer showPreferences={props.navigateToPreferences} />
    </div>
  );
};
