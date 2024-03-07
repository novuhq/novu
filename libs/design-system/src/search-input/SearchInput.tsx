import { forwardRef } from 'react';
import { Input, InputProps } from '@mantine/core';
import styled from '@emotion/styled';

import { IconClose, IconSearch } from '../iconsV2';
import { colors } from '../config';

export interface ISearchInputProps {
  placeholder?: string;
  value?: string;
  ref?: React.Ref<HTMLInputElement>;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onClearClick?: React.MouseEventHandler<SVGElement>;
  'data-test-id'?: string;
}

const ICONS_SIZE = '20';
const ICONS_COLOR = colors.B60;

const StyledInput = styled(Input)<InputProps & ISearchInputProps>`
  max-width: 15rem;

  .mantine-Input-input {
    border: none;
    background-color: transparent;
    font-size: 0.875rem;

    &::placeholder {
      color: ${colors.B40};
    }
  }
`;

const IconCloseStyled = styled(IconClose)<{ isVisible: boolean }>`
  cursor: pointer;
  display: ${({ isVisible }) => (isVisible ? 'initial' : 'none')};
`;

export const SearchInput = forwardRef<HTMLInputElement, ISearchInputProps>(
  ({ value, onClearClick, ...restSearchInputProps }, ref) => {
    return (
      <StyledInput
        {...restSearchInputProps}
        ref={ref}
        value={value}
        icon={<IconSearch size={ICONS_SIZE} color={ICONS_COLOR} title="search" />}
        rightSection={
          <IconCloseStyled
            isVisible={!!value}
            size={ICONS_SIZE}
            color={ICONS_COLOR}
            title="clear"
            onClick={onClearClick}
            data-test-id="search-input-clear"
          />
        }
      />
    );
  }
);
