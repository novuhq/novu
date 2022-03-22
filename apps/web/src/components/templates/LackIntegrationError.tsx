import React from 'react';
import styled from '@emotion/styled';
import { Text } from '../../design-system';
import { DoubleArrowRight } from '../../design-system/icons/arrows/CircleArrowRight';

export function LackIntegrationError({ channelType }: { channelType: string }) {
  return (
    <>
      <WarningMessage>
        <Text>
          {`Looks like you haven’t configured your ${channelType} provider yet, this channel will be disabled until you`}
          <StyledLink href="/integrations">configure it</StyledLink>
        </Text>
        <DoubleArrowRight />
      </WarningMessage>
    </>
  );
}

const WarningMessage = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 40px;
  color: #e54545;

  background: rgba(230, 69, 69, 0.15);
  border-radius: 7px;
`;

const StyledLink = styled.a`
  margin-left: 4px;
`;
