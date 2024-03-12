import { IIconProps } from '@novu/design-system';
import { LocalizedMessage } from '@novu/shared-web';
import { ReactNode } from 'react';
import { css } from '../../../styled-system/css';
import { styled } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';

export type RightSideTrigger = 'hover';

export interface INavMenuButtonRightSideConfig {
  node: ReactNode;
  tooltip?: LocalizedMessage;
  triggerOn?: RightSideTrigger;
}
export interface INavMenuButtonProps {
  icon: React.ReactElement<IIconProps>;
  label: LocalizedMessage;
  rightSide?: INavMenuButtonRightSideConfig;
  isVisible?: boolean;
  testId?: string;
}

export const ButtonLabel = styled('span', text);

export const rawButtonBaseStyles = css.raw({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  position: 'relative',
  py: '100',
  px: '125',
  background: 'transparent',
  // TODO: design system values when available
  borderRadius: '7px',
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
    // TODO: design system values when available
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
