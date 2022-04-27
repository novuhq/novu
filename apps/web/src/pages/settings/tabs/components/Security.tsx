import { Button, colors, Switch, Text } from '../../../../design-system';
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Description } from '../InAppCenterCard';
import { ColorScheme, useMantineTheme } from '@mantine/core';

export const Security = () => {
  const [isHmacEnabled, setIsHmacEnabled] = useState<boolean>(false);
  const { colorScheme } = useMantineTheme();

  function handlerSwitchChange() {
    setIsHmacEnabled((prev) => !prev);
  }

  return (
    <>
      <Title>Security</Title>
      <SubTitle weight="bold">Enable HMAC encryption</SubTitle>
      <InlineDiv>
        <Description>
          HMAC used to verify that the request performed by the specific user. Read more{' '}
          <StyledHref
            colorScheme={colorScheme}
            className={'security-doc-href'}
            href="https://docs.novu.co/docs/notification-center/getting-started"
            target="_blank"
            rel="noreferrer"
          >
            here.
          </StyledHref>
        </Description>
      </InlineDiv>

      <RowDiv>
        <Switch checked={isHmacEnabled} data-test-id="is_active_id" onChange={handlerSwitchChange} />
        <StyledText>{isHmacEnabled ? 'Enabled' : 'Disabled'}</StyledText>
      </RowDiv>

      <Button submit mb={20} mt={10} data-test-id="submit-branding-settings">
        Update
      </Button>
    </>
  );
};

const Title = styled(Text)`
  padding-bottom: 17px;
  font-size: 20px;
  font-weight: 700;
`;

const SubTitle = styled(Text)`
  padding-bottom: 4px;
`;

const InlineDiv = styled.div`
  display: flex;
  flex-direction: row;
  max-width: 400px;
`;

const StyledText = styled(Text)`
  display: flex;
  align-items: center;
`;

const RowDiv = styled.div`
  display: flex;
  justify-content: normal;
  margin: 18px 0 18px 0;
`;

const StyledHref = styled.a<{ colorScheme: ColorScheme }>`
  color: ${({ colorScheme }) => (colorScheme === 'dark' ? 'white' : `${colors.B40}`)};
  margin-left: 5px;
  text-decoration: underline;
`;
