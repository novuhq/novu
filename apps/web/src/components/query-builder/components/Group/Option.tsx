import React from 'react';
import { Button } from 'antd';

export interface OptionProps {
  children: React.ReactNode | React.ReactNodeArray;
  value: any;
  onClick: (value: any) => void;
  disabled: boolean;
  isSelected: boolean;
  className?: string;
}

export const Option: React.FC<OptionProps> = ({ children, isSelected, onClick, value }: OptionProps) => {
  const handleClick = () => {
    onClick(value);
  };

  return (
    <Button type={isSelected ? 'primary' : undefined} onClick={handleClick}>
      {children}
    </Button>
  );
};
