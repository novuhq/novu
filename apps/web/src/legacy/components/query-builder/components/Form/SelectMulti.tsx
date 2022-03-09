import React from 'react';
import { Select } from 'antd';
import { SelectProps } from './Select';

const { Option } = Select;

export interface SelectMultiProps extends Pick<SelectProps, 'onChange' | 'values'> {
  onDelete: (value: string) => void;
  selectedValue: string[];
}

export const SelectMulti: React.FC<SelectMultiProps> = ({
  onChange,
  onDelete,
  selectedValue,
  values,
}: SelectMultiProps) => {
  const handleChange = (value: any) => {
    onChange(String(value));
  };

  const handleDelete = (value: any) => {
    onDelete(String(value));
  };

  return (
    <Select
      style={{ minWidth: 160 }}
      mode="multiple"
      placeholder="Select your option"
      value={selectedValue}
      onSelect={handleChange}
      onDeselect={handleDelete}>
      <Option value="" disabled>
        Select your option
      </Option>
      {values.map(({ value, label }) => {
        return (
          <Option key={value} value={value}>
            {label}
          </Option>
        );
      })}
    </Select>
  );
};
