import { CoreProps, CorePropsWithChildren } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import { IIconProps } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FC, ReactNode } from 'react';
import { truncatedFlexTextCss } from '../../../studio/utils/shared.styles';
import { LocalizedMessage } from '../../../types/LocalizedMessage';

export type RightSideTrigger = 'hover';

export interface INavMenuButtonRightSideConfig {
  node: ReactNode;
  tooltip?: LocalizedMessage;
  triggerOn?: RightSideTrigger;
}
export interface INavMenuButtonProps extends CoreProps {
  icon: React.ReactElement<IIconProps> | null;
  label: LocalizedMessage;
  rightSide?: INavMenuButtonRightSideConfig;
  isVisible?: boolean;
  testId?: string;
}

export const rawButtonBaseStyles = css.raw({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  position: 'relative',
  py: '100',
  px: '125',
  background: 'transparent',
  borderRadius: '100',
  color: 'typography.text.secondary !important',
  '& svg': {
    fill: 'typography.text.secondary',
  },
  fontWeight: 'strong',
  fontFamily: 'system',
  cursor: 'pointer',

  '& > *': {
    ...truncatedFlexTextCss,
  },

  // &.active is necessary to work with the react-router-dom className they generate
  '& _active, &.active': {
    position: 'relative',
    background: 'surface.page !important',
    boxShadow: 'medium',
    backgroundClip: 'padding-box',
    color: 'typography.text.main !important',
    '& svg': {
      fill: 'typography.text.main',
    },
  },

  _hover: {
    background: 'surface.page !important',
    color: 'typography.text.main !important',
    '& svg': {
      fill: 'typography.text.main',
    },
    boxShadow: 'medium',
  },
});

type NavMenuButtonInnerProps = {
  icon: ReactNode;
} & CorePropsWithChildren;

export const NavMenuButtonInner: FC<NavMenuButtonInnerProps> = ({ icon, children, className }) => {
  return (
    <HStack gap="75" className={cx(css(truncatedFlexTextCss), className)}>
      {icon}
      <p>{children}</p>
    </HStack>
  );
};
