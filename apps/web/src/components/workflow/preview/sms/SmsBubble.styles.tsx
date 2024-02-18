import styled from '@emotion/styled';
import { Skeleton } from '@mantine/core';
import { colors, Text } from '@novu/design-system';

export const SmsBubbleHolder = styled.div`
  position: relative;
`;

export const SmsBubbleContainer = styled.div<{ isBlur: boolean; isError: boolean }>`
  position: relative;
  width: fit-content;
  min-width: 10rem;
  min-height: 2.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 1.25rem;
  background: ${({ isError }) => (isError ? colors.error : '#51ba52')};
  color: ${colors.white};
  font-size: 14px;
  line-height: 1.25rem;
  filter: ${({ isBlur }) => (isBlur ? 'blur(4px)' : 'none')};

  /**
   * The bubble tail. Consists from the two parts absolutely positioned to the bubble body.
   * The parts are represented by rectangles with left bottom border rounded, second sits on top of the first.
  */
  &::before {
    content: '';
    position: absolute;
    bottom: -0.125rem;
    right: -0.5rem;
    height: 1.25rem;
    border-right: 1.25rem solid ${({ isError }) => (isError ? colors.error : '#51ba52')};
    border-bottom-left-radius: 1rem 0.875rem;
    transform: translate(0, -0.125rem);
  }

  &::after {
    content: '';
    position: absolute;
    z-index: 1;
    bottom: -0.125rem;
    right: -2.875rem;
    width: 1rem;
    height: 1.25rem;
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? '#4b4b51' : colors.white)};
    border-bottom-left-radius: 0.625rem;
    transform: translate(-30px, -0.125rem);
  }
`;

export const BubbleText = styled(Text)`
  overflow: hidden;
  margin: 0;
  color: ${colors.white};
`;

export const Delivered = styled.span`
  position: absolute;
  bottom: -1.5rem;
  right: 0;
  font-size: 12px;
  font-weight: 500;
  color: ${colors.B80};
`;

export const Error = styled.span`
  width: max-content;
  position: absolute;
  bottom: -1.5rem;
  right: -0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${colors.error};
`;

export const SkeletonContainer = styled.div`
  display: flex;
  gap: 0.625rem;
`;

export const SkeletonFirstRect = styled(Skeleton)`
  width: 5rem;
  height: 1.25rem;

  &::before {
    background: rgba(255, 255, 255, 0.24);
  }

  &::after {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export const SkeletonSecondRect = styled(SkeletonFirstRect)`
  width: 2.5rem;
`;

export const EditLabel = styled.button`
  position: absolute;
  inset: 0;
  z-index: 2;
  min-width: 7.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  font-weight: 700;
  padding: 0;
  color: ${colors.white};
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;
`;
