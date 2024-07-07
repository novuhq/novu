import { useAppearance } from 'src/ui/context';
import { cn, useStyle } from 'src/ui/helpers';
import { Actions } from './Actions';
import { StatusDropdown } from './StatusDropdown';

export const Header = () => {
  const style = useStyle();
  const { id } = useAppearance();

  return (
    <div
      class={style('inboxHeader', cn(id, 'nt-flex nt-justify-between nt-items-center nt-self-stretch nt-py-5 nt-px-6'))}
    >
      <StatusDropdown />
      <Actions />
    </div>
  );
};
