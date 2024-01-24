import {
  FocusEventHandler,
  FormEventHandler,
  forwardRef,
  ReactNode,
  useContext,
  useImperativeHandle,
  useRef,
} from 'react';
import { IInputProps, Input } from '../input/Input';
import { PaginationContext } from './PaginationContext';
import styled from '@emotion/styled';
import { Input as MantineInput } from '@mantine/core';

export type TGoToPageInputOption = string;
export interface IGoToPageInputProps extends IInputProps {
  label?: string | ReactNode | ReactNode[];
  className?: string;
}

const InputWrapper = styled(MantineInput.Wrapper)(({ theme }) => {
  return `
  display: flex;
  flex-direction: row;
  align-items: center;

  label {
    color: inherit;
    font-size: inherit;
    line-height: inherit;
    /* FIXME: why can't I access theme values?! */
    margin-right: ${'0.5rem'}
  }
`;
});

/**
 * Input for navigating to the specified page size for Pagination.
 * @requires this component to be a child of a Pagination component
 */
export const GoToPageInput: React.FC<IGoToPageInputProps> = forwardRef<HTMLInputElement, IGoToPageInputProps>(
  ({ className, label, ...inputProps }, forwardedRef) => {
    const { onPageChange } = useContext(PaginationContext);

    /*
     * since we are forwarding the ref, we must use useImperativeHandle to be able to
     * invoke behavior on the input element
     */
    const internalRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current, []);

    const handleBlurEvent: FocusEventHandler<HTMLInputElement> = (event) => {
      const val = +event.currentTarget.value;
      if (!val) {
        return;
      }
      onPageChange(val);
    };

    const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
      // prevent double-calling of onPageChange by stopping propagation, and invoking blur explicitly
      event.stopPropagation();
      event.preventDefault();
      internalRef.current.blur();
    };

    return (
      <form onSubmit={handleSubmit}>
        <InputWrapper label={label} id="goToPage">
          <Input
            type={'number'}
            id={'goToPage'}
            ref={internalRef}
            onBlur={handleBlurEvent}
            onChange={inputProps.onChange}
            className={className}
          />
        </InputWrapper>
      </form>
    );
  }
);
