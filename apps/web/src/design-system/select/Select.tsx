import React from 'react';
import {
  Box,
  Select as MantineSelect,
  MultiSelect as MantineMultiSelect,
  ChevronIcon,
  CloseButton,
  InputBaseProps,
  MultiSelectValueProps,
  useMantineTheme,
} from '@mantine/core';
import useStyles from './Select.styles';
import { inputStyles } from '../config/inputs.styles';

interface ISelectProps {
  data: (string | { value: string; label?: string })[];
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
export function Select({ data, type = 'select', searchable = false, onChange, ...props }: ISelectProps) {
  const { classes } = useStyles();
  const searchableSelectProps = searchable ? { searchable, nothingFound: 'Nothing Found', allowDeselect: true } : {};
  const defaultDesign = {
    radius: 'md',
    size: 'md',
    rightSection: <ChevronIcon />,
    rightSectionWidth: 60,
    styles: inputStyles,
    classNames: classes,
  } as InputBaseProps;
  const multiselect = type === 'multiselect';

  return multiselect ? (
    <MantineMultiSelect
      onChange={onChange}
      {...defaultDesign}
      {...searchableSelectProps}
      data={data}
      valueComponent={Value}
      {...props}
    />
  ) : (
    <MantineSelect {...defaultDesign} {...searchableSelectProps} onChange={onChange} data={data} {...props} />
  );
}

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
