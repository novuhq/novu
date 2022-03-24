import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Text } from '../../design-system';
import { DoubleArrowRight } from '../../design-system/icons/arrows/CircleArrowRight';
import { NavigateValidatorModal } from './NavigateValidatorModal';

export function LackIntegrationError({ channelType }: { channelType: string }) {
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);

  return (
    <>
      <WarningMessage>
        <Text>
          {`Looks like you haven’t configured your ${channelType} provider yet, this channel will be disabled until you`}
          <StyledSpan onClick={() => setConfirmModalVisible(true)}>configure it</StyledSpan>

          <NavigateValidatorModal
            isOpen={confirmModalVisible}
            setModalVisibility={setConfirmModalVisible}
            navigateRoute="/integrations"
            navigateName="integration store"
          />
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

const StyledSpan = styled.span`
  margin-left: 4px;
  text-decoration: underline;
`;
