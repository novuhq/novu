import { IconButtonProps } from '@rjsf/utils';
import { Button, IconButton } from '../../components';
import { IconAdd, IconArrowDownward, IconArrowUpward, IconOutlineDeleteOutline } from '../../icons/icon-registry';

type Props = Omit<IconButtonProps, 'color' | 'translate' | 'iconType' | 'icon'>;

export function RemoveButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconOutlineDeleteOutline} />;
}

export function MoveUpButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconArrowUpward} />;
}
export function AddButton(props: Props) {
  return (
    <Button {...props} variant={'transparent'} Icon={IconAdd} ml="[1px]">
      Add item
    </Button>
  );
}

export function MoveDownButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconArrowDownward} />;
}
