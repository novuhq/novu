import { MouseEventHandler } from 'react';
import styled from '@emotion/styled';
import { colors, shadows, ChevronPlainDown } from '@novu/design-system';

const FloatingButtonHolder = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: 24px;
  right: 24px;
  outline: none;
  border: none;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B60 : colors.B70)};
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B85)};
  filter: drop-shadow(${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.light)});
  transition: color 250ms ease;

  :hover {
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};
  }
`;

const ChevronPlainUp = styled(ChevronPlainDown)`
  transform: rotate(180deg);
`;

export const FloatingButton = ({
  isUp = false,
  onClick,
}: {
  isUp?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <FloatingButtonHolder onClick={onClick}>{isUp ? <ChevronPlainUp /> : <ChevronPlainDown />}</FloatingButtonHolder>
  );
};
