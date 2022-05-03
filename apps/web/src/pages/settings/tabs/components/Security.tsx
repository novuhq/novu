import { Button, colors, Switch, Text } from '../../../../design-system';
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { ColorScheme, InputWrapper, useMantineTheme } from '@mantine/core';
import { inputStyles } from '../../../../design-system/config/inputs.styles';

export const Security = () => {
  const [isHmacEnabled, setIsHmacEnabled] = useState<boolean>(false);

  function handlerSwitchChange() {
    setIsHmacEnabled((prev) => !prev);
  }

  return (
    <>
      <Title>Security</Title>
      <InputWrapper label="Enable HMAC encryption" description={<DescriptionText />} styles={inputStyles}>
        <RowDiv>
          <Switch
            checked={isHmacEnabled}
            data-test-id="is_active_id"
            onChange={handlerSwitchChange}
            label={isHmacEnabled ? 'Enabled' : 'Disabled'}
          />
        </RowDiv>
      </InputWrapper>

      <Button submit mb={20} mt={10} data-test-id="submit-branding-settings">
        Update
      </Button>
    </>
  );
};

function DescriptionText() {
  const { colorScheme } = useMantineTheme();

  return (
    <InlineDiv>
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
    </InlineDiv>
  );
}

const Title = styled(Text)`
  padding-bottom: 17px;
  font-size: 20px;
  font-weight: 700;
`;

const InlineDiv = styled.div`
  max-width: 400px;
`;

const RowDiv = styled.div`
  display: flex;
  justify-content: normal;
  margin: 18px 0 18px 0;
`;

const StyledHref = styled.a<{ colorScheme: ColorScheme }>`
  color: ${({ colorScheme }) => (colorScheme === 'dark' ? 'white' : `${colors.B40}`)};
  text-decoration: underline;
`;
