import { IconButtonProps } from '@rjsf/utils';
import { IconButton } from '../../components';
import {
  IconArrowDownward,
  IconArrowUpward,
  IconLocalHospital,
  IconOutlineDeleteOutline,
} from '../../icons/icon-registry';

type Props = Omit<IconButtonProps, 'color' | 'translate' | 'iconType' | 'icon'>;

export function RemoveButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconOutlineDeleteOutline} />;
}

export function MoveUpButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconArrowUpward} />;
}
export function AddButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconLocalHospital} />;
}

export function MoveDownButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconArrowDownward} />;
}
