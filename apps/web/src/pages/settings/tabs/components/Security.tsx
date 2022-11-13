import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { ColorScheme, Input, useMantineTheme } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';

import { Button, colors, Switch, Text } from '../../../../design-system';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { updateWidgetSettings } from '../../../../api/environment';
import { useEnvController } from '../../../../store/use-env-controller';

export const Security = () => {
  const [isHmacEnabled, setIsHmacEnabled] = useState<boolean>(false);
  const { environment, refetchEnvironment } = useEnvController();

  const { mutateAsync: updateWidgetSettingsMutation } = useMutation<
    { logo: string; path: string },
    { error: string; message: string; statusCode: number },
    { notificationCenterEncryption: boolean | undefined }
  >(updateWidgetSettings);

  useEffect(() => {
    const isHmacEnabledEnv = environment?.widget?.notificationCenterEncryption ?? false;
    setIsHmacEnabled(isHmacEnabledEnv);
  }, [environment]);

  async function handlerSwitchChange() {
    const newIsHmacEnabled = !isHmacEnabled;
    setIsHmacEnabled(newIsHmacEnabled);
  }

  async function saveSecurityForm() {
    const data = {
      notificationCenterEncryption: isHmacEnabled,
    };

    await updateWidgetSettingsMutation(data);
    await refetchEnvironment();

    showNotification({
      message: 'Security info updated successfully',
      color: 'green',
    });
  }

  const { handleSubmit } = useForm({
    defaultValues: {
      hmacEnabled: isHmacEnabled,
    },
  });

  return (
    <>
      <form noValidate onSubmit={handleSubmit(saveSecurityForm)}>
        <Title>Security</Title>
        <Input.Wrapper label="Enable HMAC encryption" description={<DescriptionText />} styles={inputStyles}>
          <RowDiv>
            <Switch
              label={isHmacEnabled ? 'Enabled' : 'Disabled'}
              checked={isHmacEnabled || false}
              data-test-id="is_active_id"
              onChange={handlerSwitchChange}
            />
          </RowDiv>
        </Input.Wrapper>
        <Button submit mb={20} mt={10} data-test-id="submit-hmac-settings">
          Update
        </Button>
      </form>
    </>
  );
};

function DescriptionText() {
  const { colorScheme } = useMantineTheme();

  return (
    <div>
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
    </div>
  );
}

const Title = styled(Text)`
  padding-bottom: 17px;
  font-size: 20px;
  font-weight: 700;
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
