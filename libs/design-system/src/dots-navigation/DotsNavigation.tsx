import styled from '@emotion/styled';
import React from 'react';
import { colors } from '../config';

const DotsNavigationHolder = styled.ul`
  position: relative;
  display: inline-block;
  margin: 0;
  padding: 0;
  list-style: none;
  cursor: default;
  user-select: none;
`;

const DotNavigationItem = styled.li`
  position: relative;
  display: block;
  float: left;
  margin: 0 8px;
  width: 8px;
  height: 8px;
  cursor: pointer;
`;

const DotCircleItem = styled.span<{ isCurrent: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  outline: none;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  background-color: transparent;
  box-shadow: ${({ theme }) =>
    theme.colorScheme === 'dark' ? `inset 0 0 0 1px ${colors.white}` : `inset 0 0 0 1px ${colors.B60}`};
  transition: opacity 0.3s ease;

  &:after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    border-radius: 50%;
    background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};
    transform: ${({ isCurrent }) => (isCurrent ? 'scale(1)' : 'scale(0)')};
    transform-origin: 50% 50%;
    transition: transform 0.3s ease;
  }

  &:hover,
  &:focus {
    opacity: 0.7;
  }
`;

export const DotsNavigation = ({
  selectedIndex,
  size,
  className,
  testId,
  onClick,
}: {
  selectedIndex: number;
  size: number;
  className?: string;
  testId?: string;
  onClick?: (index: number, e: React.MouseEvent<HTMLLIElement>) => void;
}) => {
  return (
    <DotsNavigationHolder className={className} data-test-id={testId}>
      {Array.from({ length: size }).map((_, index) => (
        <DotNavigationItem
          key={`dot-${index}`}
          onClick={(e) => {
            onClick?.(index, e);
          }}
        >
          <DotCircleItem isCurrent={index === selectedIndex} />
        </DotNavigationItem>
      ))}
    </DotsNavigationHolder>
  );
};
