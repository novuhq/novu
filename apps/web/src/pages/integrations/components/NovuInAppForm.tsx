import styled from '@emotion/styled/macro';
import { Button, colors } from '../../../design-system';
import { Title, Text, Grid, Stack, useMantineColorScheme } from '@mantine/core';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { useEffect } from 'react';
import { updateIntegration } from '../../../api/integration';
import { useMutation } from '@tanstack/react-query';
import { ICredentialsDto } from '@novu/shared';
import { Switch } from '../../../design-system';
import { Controller, useForm } from 'react-hook-form';
import { CircleArrowRight } from '../../../design-system/icons/arrows/CircleArrowRight';
import { When } from '../../../components/utils/When';
import { errorMessage, successMessage } from '../../../utils/notifications';

export const NovuInAppForm = ({
  provider,
  showModal,
  isActive,
  setIsActive,
}: {
  provider: IIntegratedProvider | null;
  showModal: (visible: boolean) => void;
  isActive: boolean;
  setIsActive: any;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const { handleSubmit, setValue, control, watch } = useForm({
    shouldUseNativeValidation: false,
  });
  const hmac = watch('hmac');

  const { mutateAsync: updateIntegrationApi, isLoading: isLoadingUpdate } = useMutation<
    { res: string },
    { error: string; message: string; statusCode: number },
    {
      integrationId: string;
      data: { credentials: ICredentialsDto; active: boolean; check: boolean };
    }
  >(({ integrationId, data }) => updateIntegration(integrationId, data));

  const onSubmit = async (credentials) => {
    try {
      await updateIntegrationApi({
        integrationId: provider?.integrationId ? provider?.integrationId : '',
        data: { credentials, active: isActive, check: false },
      });
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error occurred');

      return;
    }

    successMessage('Successfully updated integration');

    showModal(false);
  };

  useEffect(() => {
    if (provider?.credentials) {
      for (const credential of provider.credentials) {
        if (credential.key === 'hmac') {
          setValue(credential.key, credential.value === 'true');
          continue;
        }
        setValue(credential.key, credential.value);
      }
    }
  }, [provider]);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      style={{
        overflow: 'hidden',
      }}
    >
      <Title
        sx={(theme) => ({
          fontWeight: 700,
          color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
        })}
        order={2}
        mb={24}
      >
        In-App notification center
      </Title>
      <Grid>
        <Grid.Col span={8}>
          <Text mb={10} color={colorScheme === 'dark' ? colors.white : colors.B40}>
            Security HMAC encryption
          </Text>
          <Text color={colorScheme === 'dark' ? colors.B80 : colors.B70}>
            Verify if a request is performed by a specific user
          </Text>
        </Grid.Col>
        <Grid.Col span={4}>
          <Stack
            justify="end"
            sx={{
              height: '100%',
            }}
            align="end"
          >
            <SideElementBase>
              <Controller
                control={control}
                name="hmac"
                defaultValue={false}
                render={({ field }) => (
                  <Switch
                    data-test-id="connect-integration-in-app-hmac"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Text
                data-test-id="connect-integration-in-app-hmac-text"
                ml={10}
                color={hmac ? colors.error : colors.B60}
              >
                {hmac ? 'Active' : 'Not Active'}
              </Text>
            </SideElementBase>
          </Stack>
        </Grid.Col>
      </Grid>
      <When truthy={hmac}>
        <WarningMessage>
          <Text color={colorScheme === 'dark' ? colors.white : colors.B40}>
            To finish security enabling, follow the step-by-step guide in our docs
          </Text>
          <CircleArrowRightStyled
            onClick={() => {
              window.open('https://docs.novu.co/notification-center/headless/headless-service#hmac-encryption');
            }}
          />
        </WarningMessage>
      </When>
      <ActiveWrapper active={isActive}>
        <Switch
          checked={isActive}
          data-test-id="is_active_id"
          onChange={() => {
            setIsActive((prev) => !prev);
          }}
        />
        <StyledText data-test-id="connect-integration-form-active-text">{isActive ? 'Active' : 'Disabled'}</StyledText>
      </ActiveWrapper>
      <Button data-test-id="connect-integration-form-submit" submit mb={32} fullWidth loading={isLoadingUpdate}>
        Update
      </Button>
    </form>
  );
};

const StyledText = styled(Text)`
  display: inline-block;
  word-break: normal;
  margin: 0 10px;
`;

const SideElementBase = styled.div`
  display: flex;
  justify-content: flex-start;
  & > :first-of-type {
    width: auto;
  }
`;

const ActiveWrapper = styled(SideElementBase)<{ active: boolean }>`
  align-items: center;
  margin-top: 32px;
  margin-bottom: 32px;

  ${StyledText} {
    color: ${({ active }) => (active ? colors.success : colors.error)};
  }
`;

const WarningMessage = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  color: #e54545;
  margin-top: 16px;

  background: rgba(230, 69, 69, 0.15);
  border-radius: 7px;
`;

const CircleArrowRightStyled = styled(CircleArrowRight)`
  cursor: pointer;
`;

const CloseButton = styled.button`
  position: absolute;
  right: 0;
  top: 0;
  background: transparent;
  border: none;
  color: ${colors.B40};
  outline: none;

  &:hover {
    cursor: pointer;
  }
`;
