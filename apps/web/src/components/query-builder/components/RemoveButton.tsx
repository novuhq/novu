import React from 'react';
import { Button as ButtonBase, Tooltip } from 'antd';
import styled from 'styled-components';
import { MinusCircleOutlined } from '@ant-design/icons';
import { ButtonProps } from './Button';

const StyledButton = styled(ButtonBase)`
  white-space: nowrap;
`;

export const DeleteButton: React.FC<ButtonProps> = ({ label, onClick }: ButtonProps) => (
  <Tooltip title="Click to remove rule">
    <StyledButton onClick={onClick} type="link" icon={<MinusCircleOutlined />} ghost />
  </Tooltip>
);
