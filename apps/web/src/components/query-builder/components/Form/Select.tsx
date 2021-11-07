import React from 'react';
import { Select as SelectBase } from 'antd';

export interface SelectProps {
  values: Array<{ value: string; label: string }>;
  selectedValue?: string;
  emptyValue?: string;
  onChange: (value: any) => void;
  className?: string;
  disabled?: boolean;
}

const { Option } = SelectBase;

export const Select: React.FC<SelectProps> = ({ onChange, selectedValue, values }: SelectProps) => {
  const handleChange = (value: string) => {
    onChange(value);
  };

  return (
    <SelectBase value={String(selectedValue)} style={{ width: 160 }} onChange={handleChange}>
      <Option value="" disabled>
        Select your option
      </Option>
      {values.map((option) => (
        <Option key={option.value} value={option.value}>
          {option.label}
        </Option>
      ))}
    </SelectBase>
  );
};
