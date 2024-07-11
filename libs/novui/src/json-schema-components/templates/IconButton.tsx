import { IconButtonProps } from '@rjsf/utils';
import { css } from '../../../styled-system/css';
import { Button, IconButton } from '../../components';
import { IconAdd, IconArrowDownward, IconArrowUpward, IconOutlineDeleteOutline } from '../../icons/icon-registry';

type Props = Omit<IconButtonProps, 'color' | 'translate' | 'iconType' | 'icon'>;

export function RemoveButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconOutlineDeleteOutline} />;
}

export function MoveUpButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconArrowUpward} />;
}

export function MoveDownButton(props: Props) {
  return <IconButton {...props} variant={'transparent'} Icon={IconArrowDownward} />;
}

export function AddButton(props: Props) {
  return (
    // marginLeft is used to nudge the button to make it align nicely with vertical borders
    <Button
      {...props}
      variant={'transparent'}
      size="md"
      Icon={IconAdd}
      className={css({
        '&.nv-button__root--size_md': {
          paddingBlock: '0 !important',
          paddingTop: '0 !important',
          paddingBottom: '0 !important',
          paddingInline: '0 !important',
          paddingStart: '0 !important',
        },
        '& span': {
          color: 'typography.text.main',
          WebkitTextFillColor: 'unset',
        },
      })}
    >
      Add item
    </Button>
  );
}
