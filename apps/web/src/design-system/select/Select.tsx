import React from 'react';
import {
  Box,
  Select as MantineSelect,
  MultiSelect as MantineMultiSelect,
  CloseButton,
  InputBaseProps,
  MultiSelectValueProps,
  useMantineTheme,
} from '@mantine/core';
import useStyles from './Select.styles';
import { inputStyles } from '../config/inputs.styles';
import { ArrowDown, Search } from '../icons';

interface ISelectProps {
  data: (string | { value: string; label?: string })[];
  value?: string[] | string | null;
  onChange?: (value: string[] | string | null) => void;
  label?: React.ReactNode;
  placeholder?: string;
  description?: string;
  searchable?: boolean;
  type?: 'multiselect' | 'select';
}

/**
 * Select component
 *
 */
export const Select = React.forwardRef<HTMLInputElement, ISelectProps>(
  ({ data, type = 'select', value, searchable = false, onChange, ...props }: ISelectProps, ref) => {
    const { classes } = useStyles();
    const searchableSelectProps = searchable
      ? {
          searchable,
          nothingFound: 'Nothing Found',
          allowDeselect: true,
          rightSectionWidth: 50,
          rightSection: <Search />,
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

    return multiselect ? (
      <MantineMultiSelect
        ref={ref}
        onChange={onChange}
        value={value as string[] | undefined}
        {...defaultDesign}
        {...searchableSelectProps}
        data={data}
        valueComponent={Value}
        {...props}
      />
    ) : (
      <MantineSelect
        ref={ref}
        value={value as string | undefined}
        {...defaultDesign}
        {...searchableSelectProps}
        onChange={onChange}
        data={data}
        {...props}
      />
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
