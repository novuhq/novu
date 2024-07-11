import { IconButtonProps } from '@rjsf/utils';
import { ButtonHTMLAttributes, FC } from 'react';
import { IconType } from '../../icons';
import { css, cx } from '../../../styled-system/css';
import { Button, IconButton } from '../../components';
import { IconAdd, IconArrowDownward, IconArrowUpward, IconOutlineDeleteOutline } from '../../icons/icon-registry';

type Props = Omit<IconButtonProps, 'color' | 'translate' | 'iconType' | 'icon'>;

const SimpleIconButton: FC<ButtonHTMLAttributes<HTMLButtonElement> & { Icon: IconType }> = ({
  Icon,
  title,
  ...buttonProps
}) => (
  <button className={css({ cursor: 'pointer', _hover: { opacity: 'hover' } })} {...buttonProps}>
    <Icon title={title} />
  </button>
);

export function RemoveButton(props: Props) {
  return <SimpleIconButton {...props} Icon={IconOutlineDeleteOutline} />;
}

export function MoveUpButton(props: Props) {
  return <SimpleIconButton {...props} Icon={IconArrowUpward} />;
}

export function MoveDownButton(props: Props) {
  return <SimpleIconButton {...props} Icon={IconArrowDownward} />;
}

export function AddButton({ className, ...props }: Props) {
  return (
    // marginLeft is used to nudge the button to make it align nicely with vertical borders
    <Button
      {...props}
      variant={'transparent'}
      size="md"
      Icon={IconAdd}
      className={cx(
        css({
          '& span': {
            color: 'typography.text.main',
            WebkitTextFillColor: 'unset',
          },
        }),
        className
      )}
    >
      Add item
    </Button>
  );
}
