import { useRef } from 'react';
import styled from '@emotion/styled';

import { colors } from '@novu/design-system';

const IndicatorHolder = styled.span<{ isShown }>`
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  min-width: 24px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${colors.horizontal};
  font-size: 14px;
  color: ${colors.white};
  opacity: ${({ isShown }) => (isShown ? 1 : 0)};
  transition: opacity 0.3s ease-in-out;
`;

export const Indicator = ({ isShown, value }: { isShown: boolean; value: string }) => {
  const previousValue = useRef(value);
  if (isShown) {
    previousValue.current = value;
  }

  return <IndicatorHolder isShown={isShown}>{isShown ? value : previousValue.current}</IndicatorHolder>;
};
