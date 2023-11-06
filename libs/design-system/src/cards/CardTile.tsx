import styled from '@emotion/styled';
import { colors, shadows } from '../config';

export const CardTile = styled.button`
  outline: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-width: 140px;
  width: 140px;
  height: 100px;
  border-radius: 8px;
  color: ${colors.B60};
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.B98)};
  box-shadow: ${shadows.dark};
  font-size: 14px;
  transition: all 0.25s ease;

  > svg {
    font-size: 20px;
  }

  &:disabled {
    cursor: not-allowed;
  }

  &:not(:disabled)&:hover {
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.BGLight)};
  }

  &[data-can-be-hidden='true'] {
    &:nth-last-of-type(2) {
      display: none;
    }

    @media screen and (min-width: 1369px) {
      &:nth-last-of-type(2) {
        display: flex;
      }
    }
  }

  @media screen and (min-width: 1281px) {
    min-width: 160px;
    width: 160px;
    height: 120px;

    > svg {
      font-size: 24px;
    }
  }
`;
