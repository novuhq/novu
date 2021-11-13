import React from 'react';
import { Button as ButtonBase } from 'antd';

export interface ButtonProps {
  onClick: () => void;
  className?: string;
  label: string;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, ...rest }: ButtonProps) => (
  <ButtonBase onClick={onClick} type="primary" ghost {...rest}>
    {label}
  </ButtonBase>
);
