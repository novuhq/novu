import { MouseEventHandler, useState } from 'react';
import { PencilOutlined } from '@novu/design-system';

import {
  BubbleText,
  Delivered,
  EditLabel,
  Error,
  SkeletonContainer,
  SkeletonFirstRect,
  SkeletonSecondRect,
  SmsBubbleContainer,
  SmsBubbleHolder,
} from './SmsBubble.styles';

interface ISmsBubbleProps {
  className?: string;
  text?: string;
  isLoading?: boolean;
  onEditClick?: MouseEventHandler<HTMLButtonElement>;
  error?: string;
}

export const SmsBubble: React.FC<ISmsBubbleProps> = ({ className, text = '', isLoading, onEditClick, error }) => {
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
          <BubbleText rows={3}>{text}</BubbleText>
        )}
        {isError ? <Error>{error}</Error> : <Delivered>Delivered</Delivered>}
      </SmsBubbleContainer>
    </SmsBubbleHolder>
  );
};
