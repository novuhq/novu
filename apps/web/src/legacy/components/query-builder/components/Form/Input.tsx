import React from 'react';
import { Input as InputBase, DatePicker } from 'antd';
import moment from 'moment';

export interface InputProps {
  type: 'date' | 'number' | 'text';
  value: string;
  onChange: (value: string) => void;
}

export const Input: React.FC<InputProps> = ({ onChange, value, type }: InputProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleChangeDate = (date: any) => {
    onChange(date.format('YYYY-MM-DD'));
  };

  if (type === 'date') {
    return <DatePicker value={value ? moment(value, 'YYYY-MM-DD') : undefined} onChange={handleChangeDate} />;
  }

  return <InputBase style={{ width: 160 }} onChange={handleChange} value={value} type={type} />;
};
