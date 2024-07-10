import { cn, useStyle } from '../../helpers';
import { ActionsContainer } from './ActionsContainer';
import { StatusDropdown } from './StatusDropdown';

type HeaderProps = {
  showSettings: () => void;
};

export const Header = (props: HeaderProps) => {
  const style = useStyle();

  return (
    <div class={style('inboxHeader', cn('nt-flex nt-justify-between nt-items-center nt-w-full nt-py-5 nt-px-6'))}>
      <StatusDropdown />
      <ActionsContainer showSettings={props.showSettings} />
    </div>
  );
};
