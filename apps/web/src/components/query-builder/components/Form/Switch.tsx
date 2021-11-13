import React from 'react';
import styled, { css } from 'styled-components';
import { colors } from '../../constants/colors';

const Knob = styled.div`
  position: absolute;
  width: 1.3rem;
  height: 1.3rem;
  background: white;
  border: 1px solid ${colors.dark};
  border-radius: 50%;
  box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, 0.4);
`;

const StyledSwitch = styled.div<{ switched: boolean; disabled: boolean }>`
  position: relative;
  width: 3rem;
  height: 1.65rem;
  background-color: ${({ switched }) => (switched ? colors.primary : colors.darker)};
  border: 1px solid ${colors.dark};
  border-radius: 1.4rem;
  cursor: pointer;
  transition: all 0.5s;

  ${({ disabled }) =>
    disabled &&
    css`
      background-color: ${colors.darker};
      cursor: initial;

      ${Knob} {
        background: ${colors.disabled};
      }
    `}

  ${Knob} {
    top: 0.1rem;
    left: ${({ switched }) => (switched ? '1.3rem' : '0.1rem')};
    transition: all 0.5s;
  }
`;

export interface SwitchProps {
  switched: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ switched, onChange, disabled = false, className }: SwitchProps) => {
  const handleClick = () => {
    if (onChange && !disabled) {
      onChange(!switched);
    }
  };

  return (
    <StyledSwitch
      data-test="Switch"
      switched={switched}
      disabled={!!disabled}
      onClick={handleClick}
      className={className}>
      <Knob />
    </StyledSwitch>
  );
};
