import styled from '@emotion/styled';
import { Skeleton } from '@mantine/core';
import { colors, PencilOutlined } from '@novu/design-system';
import { MouseEventHandler, useState } from 'react';

const SmsBubbleHolder = styled.div`
  position: relative;
`;

const SmsBubbleContainer = styled.div<{ isBlur: boolean; isError: boolean }>`
  position: relative;
  width: fit-content;
  min-width: 160px;
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 20px;
  background: ${({ isError }) => (isError ? colors.error : '#51ba52')};
  color: ${colors.white};
  font-size: 14px;
  line-height: 20px;
  filter: ${({ isBlur }) => (isBlur ? 'blur(4px)' : 'none')};

  &::before {
    content: '';
    position: absolute;
    bottom: -2px;
    right: -7px;
    height: 20px;
    border-right: 20px solid ${({ isError }) => (isError ? colors.error : '#51ba52')};
    border-bottom-left-radius: 16px 14px;
    transform: translate(0, -2px);
  }

  &::after {
    content: '';
    position: absolute;
    z-index: 1;
    bottom: -2px;
    right: -46px;
    width: 16px;
    height: 20px;
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? '#4b4b51' : colors.white)};
    border-bottom-left-radius: 10px;
    transform: translate(-30px, -2px);
  }
`;

const BubbleText = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

const Delivered = styled.span`
  position: absolute;
  bottom: -24px;
  right: 0;
  font-size: 12px;
  font-weight: 500;
  color: #909093;
`;

const Error = styled.span`
  width: max-content;
  position: absolute;
  bottom: -24px;
  right: -6px;
  font-size: 12px;
  font-weight: 500;
  color: ${colors.error};
`;

const SkeletonContainer = styled.div`
  display: flex;
  gap: 10px;
`;

const SkeletonFirstRect = styled(Skeleton)`
  width: 80px;
  height: 20px;

  &::before {
    background: rgba(255, 255, 255, 0.24);
  }

  &::after {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const SkeletonSecondRect = styled(SkeletonFirstRect)`
  width: 40px;
`;

const EditLabel = styled.button`
  position: absolute;
  inset: 0;
  z-index: 2;
  min-width: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  padding: 0;
  color: ${colors.white};
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;
`;

interface ISmsBubbleProps {
  className?: string;
  text?: string;
  isLoading?: boolean;
  onEditClick?: MouseEventHandler<HTMLButtonElement>;
  error?: string;
}

export const SmsBubble: React.FC<ISmsBubbleProps> = ({ className, text, isLoading, onEditClick, error }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isError = !!error;

  const onEditClickHandler: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onEditClick?.(e);
  };

  return (
    <SmsBubbleHolder
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <EditLabel onClick={onEditClickHandler}>
          <PencilOutlined />
          Edit message
        </EditLabel>
      )}
      <SmsBubbleContainer isError={isError} isBlur={isHovered}>
        {isLoading ? (
          <SkeletonContainer>
            <SkeletonFirstRect />
            <SkeletonSecondRect />
          </SkeletonContainer>
        ) : (
          <BubbleText title={text}>{text}</BubbleText>
        )}
        {isError ? <Error>{error}</Error> : <Delivered>Delivered</Delivered>}
      </SmsBubbleContainer>
    </SmsBubbleHolder>
  );
};
