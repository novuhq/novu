import React from 'react';
import {
  Box,
  Select as MantineSelect,
  MultiSelect as MantineMultiSelect,
  CloseButton,
  InputBaseProps,
  MultiSelectValueProps,
  useMantineTheme,
  MantineMargins,
  LoadingOverlay,
} from '@mantine/core';
import useStyles from './Select.styles';
import { inputStyles } from '../config/inputs.styles';
import { ArrowDown } from '../icons';
import { colors } from '../config';

interface ISelectProps extends MantineMargins {
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

    return (
      <div style={{ position: 'relative', minHeight: 50 }}>
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
            creatable
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
            creatable
            onChange={onChange}
            data={data}
            {...props}
          />
        )}
      </div>
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
        margin: '0px 5px',
      }}>
      <div
        style={{
          margin: '6.5px 3px 6.5px 10px',
          lineHeight: '20px',
          fontSize: 14,
          fontWeight: 400,
        }}>
        {label}
      </div>
      <CloseButton style={{ color }} onMouseDown={onRemove} variant="transparent" size={30} iconSize={15} />
    </Box>
  );
}
