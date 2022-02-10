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
import CheckboxItem from './CheckboxItem';
import useStyles from './Select.styles';
import { inputStyles } from '../config/inputs.styles';

interface ISelectProps {
  data: (string | { value: string; label?: string })[];
  label?: React.ReactNode;
  placeholder?: string;
  description?: string;
  type?: 'Checkbox' | 'Label';
}

function Value({ label, onRemove, classNames, ...others }: MultiSelectValueProps) {
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

/**
 * Select component
 *
 */
export function Select({ data, type = 'Label', ...props }: ISelectProps) {
  const { classes } = useStyles();
  const defaultDesign = {
    radius: 'md',
    size: 'md',
    rightSection: <ChevronIcon />,
    rightSectionWidth: 60,
    styles: inputStyles,
    classNames: classes,
  } as InputBaseProps;
  const multiselect = type === 'Checkbox';
  return multiselect ? (
    <MantineMultiSelect
      {...defaultDesign}
      data={data}
      filter={() => true}
      searchable
      valueComponent={Value}
      itemComponent={CheckboxItem}
      {...props}
    />
  ) : (
    <MantineSelect {...defaultDesign} data={data} {...props} />
  );
}
