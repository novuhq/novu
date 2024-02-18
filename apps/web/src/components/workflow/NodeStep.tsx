import styled from '@emotion/styled';
import React from 'react';
import { colors, shadows, Text } from '@novu/design-system';

type NodeStepProps = {
  className?: string;
  data: { label: string; email?: string };
  Handlers: React.FC<any>;
  Icon: React.FC<any>;
  ActionItem?: React.ReactNode;
  ContentItem?: React.ReactNode;
};

export function NodeStep({ className, Handlers, Icon, data, ActionItem, ContentItem }: NodeStepProps) {
  const labelLowerCase = data.label.toLowerCase();

  return (
    <>
      <StepCard className={className} data-test-id={`data-test-id-${labelLowerCase}`}>
        <ContentContainer>
          <LeftContent>
            <Icon />
            <Text weight={'bold'}>{data.label} </Text>
          </LeftContent>
          {ActionItem}
        </ContentContainer>
        {ContentItem}
      </StepCard>
      <Handlers />
    </>
  );
}

const ContentContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  pointer-events: all;
`;

const LeftContent = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  svg {
    stop:first-of-type {
      stop-color: #dd2476 !important;
    }
    stop:last-child {
      stop-color: #ff512f !important;
    }
  }
`;

const StepCard: any = styled.div`
  position: relative;
  display: flex;
  width: 280px;
  height: 80px;
  box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.light)};
  border-radius: 7px;
  pointer-events: none;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.white)};
  margin: 0;
  padding: 20px;
`;
