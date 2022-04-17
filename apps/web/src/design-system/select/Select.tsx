import React from 'react';
import {
  Box,
  Select as MantineSelect,
  MultiSelect as MantineMultiSelect,
  CloseButton,
  InputBaseProps,
  MultiSelectValueProps,
  useMantineTheme,
  LoadingOverlay,
  SelectItem,
} from '@mantine/core';
import styled from '@emotion/styled';
import useStyles from './Select.styles';
import { inputStyles } from '../config/inputs.styles';
import { ArrowDown } from '../icons';
import { colors } from '../config';
import { Text } from '../index';
import { SpacingProps } from '../shared/spacing.props';

interface ISelectProps extends SpacingProps {
  data: (string | { value: string; label?: string })[];
  value?: string[] | string | null;
  onChange?: (value: string[] | string | null) => void;
  label?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  description?: string;
  getCreateLabel?: (query: string) => React.ReactNode;
  onCreate?: (query: string) => void;
  onDropdownOpen?: () => void;
  searchable?: boolean;
  creatable?: boolean;
  loading?: boolean;
  type?: 'multiselect' | 'select';
  filter?: (value: string, item: SelectItem) => boolean;
}

/**
 * Select component
 *
 */
export const Select = React.forwardRef<HTMLInputElement, ISelectProps>(
  (
    {
      data,
      type = 'select',
      value,
      filter,
      searchable = false,
      creatable = false,
      loading = false,
      onChange,
      ...props
    }: ISelectProps,
    ref
  ) => {
    const { classes, theme } = useStyles();
    const searchableSelectProps = searchable
      ? {
          searchable,
          nothingFound: 'Nothing Found',
          clearable: true,
        }
      : {};
    const defaultDesign = {
      radius: 'md',
      size: 'md',
      rightSection: <ArrowDown />,
      rightSectionWidth: 50,
      styles: inputStyles,
      classNames: classes,
    } as InputBaseProps;
    const multiselect = type === 'multiselect';

    let filterResults: ((value: string, item: SelectItem) => boolean) | undefined = filter;

    if (creatable && !filter) {
      filterResults = (currentValue, _) => {
        const isEmptyValue = !currentValue;
        const includedInExistingGroups = !!data.find((group) => {
          return (group as SelectItem)?.label?.toLowerCase().includes(currentValue.toLowerCase());
        });
        const showAllOptionsInSelect = isEmptyValue || includedInExistingGroups;

        return showAllOptionsInSelect;
      };
    }

    return (
      <Wrapper style={{ position: 'relative' }}>
        <LoadingOverlay
          visible={loading}
          overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
          loaderProps={{
            color: colors.error,
          }}
        />
        {multiselect ? (
          <MantineMultiSelect
            ref={ref}
            onChange={onChange}
            autoComplete="nope"
            value={value as string[] | undefined}
            {...defaultDesign}
            {...searchableSelectProps}
            creatable={creatable}
            data={data}
            valueComponent={Value}
            {...props}
          />
        ) : (
          <MantineSelect
            ref={ref}
            value={value as string | undefined}
            autoComplete="nope"
            {...defaultDesign}
            {...searchableSelectProps}
            creatable={creatable}
            filter={filterResults}
            onChange={onChange}
            data={data}
            {...props}
          />
        )}
      </Wrapper>
    );
  }
);

function Value({ label, onRemove }: MultiSelectValueProps) {
  const theme = useMantineTheme();
  const dark = theme.colorScheme === 'dark';
  const backgroundColor = dark ? theme.colors.dark[4] : theme.colors.gray[0];
  const color = dark ? theme.colors.dark[3] : theme.colors.gray[5];

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        borderRadius: '5px',
        backgroundColor,
        margin: '5px',
      }}
    >
      <div
        style={{
          margin: '6.5px 0px 6.5px 10px',
          lineHeight: '20px',
          maxWidth: '80px',
          fontSize: 14,
          fontWeight: 400,
        }}
      >
        <Text rows={1}>{label}</Text>
      </div>
      <CloseButton style={{ color }} onMouseDown={onRemove} variant="transparent" size={30} iconSize={15} />
    </Box>
  );
}

const Wrapper = styled.div`
  .mantine-MultiSelect-values {
    min-height: 48px;
    padding: 0;
  }

  .mantine-MultiSelect-input {
    min-height: 50px;

    input {
      height: 100%;
    }
  }
`;
