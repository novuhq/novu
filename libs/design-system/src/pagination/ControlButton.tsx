import styled from '@emotion/styled';
import { CSSProperties, forwardRef, useContext } from 'react';
import { colors } from '../config';
import { Button, IButtonProps } from '../button/Button';
import { IPaginationContext, PaginationContext } from './PaginationContext';

export type TPageButtonClickHandler = (ctx: IPaginationContext) => void;

type StyleFlags = { isCurrentPage?: boolean; isSingleDigit?: boolean; isRichNode?: boolean };
type StylingProps = { flags: StyleFlags };

// TODO: Fix `theme` type once design system is ready and then use theme values
const getFontColor = ({ theme, flags }: { theme: any } & StylingProps): string => {
  return theme.colorScheme !== 'light'
    ? flags.isCurrentPage || flags.isRichNode
      ? colors.white
      : colors.B60
    : flags.isCurrentPage || flags.isRichNode
    ? 'black'
    : colors.B60;
};

// TODO: Fix `theme` type once design system is ready and then use theme values
const getDisabledFontColor = ({ theme, flags }: { theme: any } & StylingProps): string => {
  return !flags.isRichNode ? getFontColor({ theme, flags }) : theme.colorScheme !== 'light' ? colors.B40 : colors.B80;
};

// TODO: Fix `theme` type once design system is ready and then use theme values
const getFontWeight = ({ theme, flags }: { theme: any } & StylingProps): CSSProperties['fontWeight'] => {
  return flags.isCurrentPage ? 700 : 600;
};

// TODO: Fix `theme` type once design system is ready and then use theme values
const getBackgroundColor = ({ theme, flags }: { theme: any } & StylingProps): CSSProperties['fontWeight'] => {
  return flags.isCurrentPage ? (theme.colorScheme !== 'light' ? colors.B30 : colors.BGLight) : 'none';
};

const StyledButton = styled(Button)<StylingProps>(
  ({ theme, flags }) => `
  font-weight: ${getFontWeight({ theme, flags })};
  background: ${getBackgroundColor({ theme, flags })};
  color: ${getFontColor({ theme, flags })};
  /* SVG / icon overrides */
  path {
    fill: ${getFontColor({ theme, flags })};
  }

  &:disabled {
    background: ${getBackgroundColor({ theme, flags })};
    color: ${getDisabledFontColor({ theme, flags })};
    /* SVG / icon overrides */
    path {
      fill: ${getDisabledFontColor({ theme, flags })};
    }
  }
  
  /* override mantine */
  height: inherit;
  
  /* TODO: theme values for next few lines */
  border-radius: 4px;
  line-height: 20px;
  padding: 2px ${flags.isSingleDigit ? '7.5px' : '3.5px'};
`
);

export interface IControlButtonProps extends Omit<IButtonProps, 'onClick'> {
  onClick?: TPageButtonClickHandler;
}

/**
 * Button for navigating to a specific page.
 * @requires this component to be a child of a Pagination component
 */
export const ControlButton: React.FC<IControlButtonProps> = forwardRef<HTMLButtonElement, IControlButtonProps>(
  ({ onClick, className, id, disabled, ...buttonProps }, buttonRef) => {
    const paginationCtx = useContext(PaginationContext);

    // is the child a label for the current page value
    const isCurrentPage =
      typeof buttonProps.children === 'number' ? buttonProps.children === paginationCtx.currentPageNumber : false;
    // is the child a number of length 1?
    const isSingleDigit = typeof buttonProps.children === 'number' ? `${buttonProps.children}`.length === 1 : false;
    // is the child an icon or other wrapped value?
    const isRichNode = typeof buttonProps.children === 'object';

    // hydrate the click handler with the context
    const handleClick = () => onClick?.(paginationCtx);

    return (
      <StyledButton
        flags={{
          isCurrentPage,
          isSingleDigit,
          isRichNode,
        }}
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
