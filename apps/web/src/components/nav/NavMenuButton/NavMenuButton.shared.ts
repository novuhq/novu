import { IIconProps } from '@novu/design-system';
import { LocalizedMessage } from '../../../types/LocalizedMessage';
import { ReactNode } from 'react';
import { css } from '@novu/novui/css';
import { CoreProps } from '@novu/novui';

export type RightSideTrigger = 'hover';

export interface INavMenuButtonRightSideConfig {
  node: ReactNode;
  tooltip?: LocalizedMessage;
  triggerOn?: RightSideTrigger;
}
export interface INavMenuButtonProps extends CoreProps {
  icon: React.ReactElement<IIconProps>;
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
