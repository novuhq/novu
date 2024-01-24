import { forwardRef } from 'react';
import { Button, IButtonProps } from '../button/Button';

export type TPageButtonClickHandlerContext = {};
export type TPageButtonClickHandler = () => void;

export interface IPageButtonProps extends Omit<IButtonProps, 'onClick'> {
  onClick: TPageButtonClickHandler;
}

/**
 * Button for navigating to a specific page.
 * @requires this component to be a child of a Pagination component
 */
export const PageButton: React.FC<IPageButtonProps> = forwardRef<HTMLButtonElement, IPageButtonProps>(
  ({ className, onClick, id, disabled, ...buttonProps }, buttonRef) => {
    // const { to } = useContext(PaginationContext);

    return (
      <Button id={id} onClick={onClick} disabled={disabled} ref={buttonRef} className={className}>
        {buttonProps.children}
      </Button>
    );
  }
);
