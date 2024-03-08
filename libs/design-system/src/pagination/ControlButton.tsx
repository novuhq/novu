import styled from '@emotion/styled';
import { useMantineTheme } from '@mantine/core';
import { CSSProperties, forwardRef, useContext } from 'react';
import { Button, IButtonProps } from '../button/Button';
import { colors } from '../config';
import { IPaginationContext, PaginationContext } from './PaginationContext';
export type TPageButtonClickHandler = (ctx: IPaginationContext) => void;

type StylingProps = Pick<IControlButtonProps, 'isCurrentPage'>;

// TODO: Fix `theme` type once design system is ready and then use theme values
const getFontColor = ({ theme, isCurrentPage }: { theme: any } & StylingProps): string => {
  return theme.colorScheme === 'dark'
    ? isCurrentPage
      ? colors.white
      : colors.B60
    : isCurrentPage
    ? colors.BGDark // TODO: speak with Design -- this is bad, we should not be using a "BG" color for font
    : colors.B60;
};

// TODO: Fix `theme` type once design system is ready and then use theme values
const getFontWeight = ({ theme, isCurrentPage }: { theme: any } & StylingProps): CSSProperties['fontWeight'] => {
  return isCurrentPage ? 700 : 600;
};

// TODO: Fix `theme` type once design system is ready and then use theme values
const getBackgroundColor = ({ theme, isCurrentPage }: { theme: any } & StylingProps): CSSProperties['fontWeight'] => {
  return isCurrentPage ? (theme.colorScheme === 'dark' ? colors.B30 : colors.BGLight) : 'none';
};

const StyledButton = styled(Button, {
  shouldForwardProp: (propName: string) => {
    return propName !== 'isCurrentPage';
  },
})<StylingProps>(
  ({ theme, isCurrentPage }) => `
  font-weight: ${getFontWeight({ theme, isCurrentPage })};
  background: ${getBackgroundColor({ theme, isCurrentPage })};
  color: ${getFontColor({ theme, isCurrentPage })};

  & .mantine-Button-label {
    background-image: none;
  }

  &:disabled {
    background: ${getBackgroundColor({ theme, isCurrentPage })};
    color: ${getFontColor({ theme, isCurrentPage })};
  }
  
  /* override mantine */
  height: inherit;
  
  /* TODO: theme values for next few lines */
  border-radius: 4px;
  line-height: 20px;
  padding: 2px 3.5px;
  min-width: 24px;
`
);

export interface IControlButtonProps extends Omit<IButtonProps, 'onClick'> {
  onClick?: TPageButtonClickHandler;
  /** Does the button represent the currently-selected page */
  isCurrentPage?: boolean;
}

/**
 * Button for navigating to a specific page.
 * @requires this component to be a child of a Pagination component
 */
export const ControlButton: React.FC<IControlButtonProps> = forwardRef<HTMLButtonElement, IControlButtonProps>(
  ({ onClick, className, id, disabled, isCurrentPage, ...buttonProps }, buttonRef) => {
    const paginationCtx = useContext(PaginationContext);

    // hydrate the click handler with the context
    const handleClick = () => onClick?.(paginationCtx);

    return (
      <StyledButton
        theme={useMantineTheme()}
        isCurrentPage={isCurrentPage}
        id={id}
        onClick={handleClick}
        disabled={disabled || !onClick}
        ref={buttonRef}
        className={className}
      >
        {buttonProps.children}
      </StyledButton>
    );
  }
);
