import {
  FocusEventHandler,
  forwardRef,
  KeyboardEventHandler,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { PaginationContext } from './PaginationContext';
import styled from '@emotion/styled';
import { Input, NumberInput, NumberInputProps, useMantineTheme } from '@mantine/core';
import { Tooltip } from '../tooltip/Tooltip';
import { FIRST_PAGE_NUMBER } from './Pagination.const';
import { colors } from '../config';

export interface IGoToPageInputProps extends NumberInputProps {
  firstPageNumber?: number;
}

const InputWrapper = styled(Input.Wrapper)(({ theme }) => {
  return `
  display: flex;
  flex-direction: row;
  align-items: center;

      
  /**
   * TODO: use theme values for color styles below.
   * Should be enforced for all child elements as these are in the design system.
   */
  color: ${theme.colorScheme === 'dark' ? colors.B60 : colors.B40};

  input {
    background-color: transparent;
    border-color: ${theme.colorScheme === 'dark' ? colors.B30 : colors.B80};
    margin: 0;
    min-height: inherit;
    height: 32px;
    text-align: center;
    min-width: 56px;
    max-width: 60px;

    &:focus, &:focus-within {
      border-color: ${theme.colorScheme === 'dark' ? colors.B60 : colors.B60};
    }
  }

  label {
    color: inherit;
    font-size: inherit;
    line-height: inherit;
    text-wrap: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    /* TODO: use theme values */
    margin-right: ${'0.5rem'};
  }
`;
});

/**
 * Input for navigating to the specified page size for Pagination.
 * @requires this component to be a child of a Pagination component
 */
export const GoToPageInput: React.FC<IGoToPageInputProps> = forwardRef<HTMLInputElement, IGoToPageInputProps>(
  ({ label, firstPageNumber = FIRST_PAGE_NUMBER, ...inputProps }, forwardedRef) => {
    const { onPageChange, totalPageCount } = useContext(PaginationContext);
    const [hasError, setHasError] = useState<boolean>(false);
    const [goToValue, setGoToValue] = useState<number | undefined>(undefined);

    const validateValue = (val: number | string) => {
      const numVal = +val;

      return !!numVal && numVal >= 1 && numVal <= totalPageCount;
    };

    /*
     * since we are forwarding the ref, we must use useImperativeHandle to be able to
     * invoke behavior on the input element
     */
    const internalRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current, []);

    const handleBlurEvent: FocusEventHandler<HTMLInputElement> = (event) => {
      const val = event.currentTarget.value;

      // check for empty value and ensure user can clear error
      if (!val) {
        setHasError(false);

        return;
      }

      if (!validateValue(val)) {
        setHasError(val !== undefined);

        return;
      }
      onPageChange(+val);
      setGoToValue(undefined);
      setHasError(false);
    };

    const handleKeyPress: KeyboardEventHandler<HTMLInputElement> = (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      internalRef.current.blur();
    };

    return (
      <InputWrapper label={label} id="goToPage" theme={useMantineTheme()}>
        <Tooltip
          opened={hasError}
          data-test-id="conditions-form-tooltip-error"
          error
          position="top-end"
          label={`Value must be between ${firstPageNumber} and ${totalPageCount}`}
        >
          <NumberInput
            onKeyDown={handleKeyPress}
            value={goToValue}
            onChange={setGoToValue}
            id={'goToPage'}
            ref={internalRef}
            onBlur={handleBlurEvent}
            min={firstPageNumber}
            max={totalPageCount}
            maxLength={`${totalPageCount}`.length}
            hideControls
            noClampOnBlur
            autoCorrect={'none'}
            aria-autocomplete={'none'}
            autoComplete={'none'}
            disabled={totalPageCount === 1}
            {...inputProps}
          />
        </Tooltip>
      </InputWrapper>
    );
  }
);
