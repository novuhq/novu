import { useAppearance } from '../../context';
import { cn, useStyle } from '../../helpers';
import { ActionsContainer } from './ActionsContainer';
import { StatusDropdown } from './StatusDropdown';

type HeaderProps = {
  showSettings: () => void;
};

export const Header = (props: HeaderProps) => {
  const style = useStyle();
  const { id } = useAppearance();

  return (
    <div
      class={style('inboxHeader', cn(id, 'nt-flex nt-justify-between nt-items-center nt-self-stretch nt-py-5 nt-px-6'))}
    >
      <StatusDropdown />
      <ActionsContainer showSettings={props.showSettings} />
    </div>
  );
};
