import { useMemo } from 'react';
import styled from '@emotion/styled/macro';
import { Title, Text, Grid, Stack, useMantineColorScheme } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import type { IResponseError, ICredentialsDto } from '@novu/shared';
import { UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';
import { Switch, Button, colors, CircleArrowRight } from '@novu/design-system';

import { IIntegratedProvider } from '../types';
import { updateIntegration } from '../../../api/integration';
import { When } from '../../../components/utils/When';
import { errorMessage, successMessage } from '../../../utils/notifications';

export const NovuInAppForm = ({
  provider,
  showModal,
}: {
  provider: IIntegratedProvider | null;
  showModal: (visible: boolean) => void;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const { handleSubmit, control, watch } = useForm({
    shouldUseNativeValidation: false,
  });
  const hmac = watch('hmac');

  const { mutateAsync: updateIntegrationApi, isLoading: isLoadingUpdate } = useMutation<
    { res: string },
    IResponseError,
    {
      integrationId: string;
      data: { credentials: ICredentialsDto; active: boolean; check: boolean };
    }
  >(({ integrationId, data }) => updateIntegration(integrationId, data));

  const hmacDefaultValue = useMemo(() => {
    const credential = provider?.credentials?.find((item) => item.key === 'hmac');

    if (!credential) {
      return false;
    }

    if (typeof credential.value === 'boolean') {
      return credential.value;
    }

    return credential.value === 'true';
  }, [provider?.credentials]);

  const onSubmit = async (values) => {
    try {
      await updateIntegrationApi({
        integrationId: provider?.integrationId ?? '',
        data: { credentials: { hmac: values.hmac }, active: values.active, check: false },
      });
      successMessage('Successfully updated integration');

      showModal(false);
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error occurred');
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      style={{
        overflow: 'hidden',
      }}
    >
      <Title
        sx={() => ({
          fontWeight: 700,
          color: colorScheme === 'dark' ? colors.white : colors.B40,
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
                defaultValue={hmacDefaultValue}
                render={({ field }) => (
                  <>
                    <Switch
                      data-test-id="connect-integration-in-app-hmac"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    <Text
                      data-test-id="connect-integration-in-app-hmac-text"
                      ml={10}
                      color={field.value ? colors.error : colors.B60}
                    >
                      {field.value ? 'Active' : 'Disabled'}
                    </Text>
                  </>
                )}
              />
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
              window.open(
                `https://docs.novu.co/notification-center/client/iframe#enabling-hmac-encryption${UTM_CAMPAIGN_QUERY_PARAM}`
              );
            }}
          />
        </WarningMessage>
      </When>
      <Controller
        control={control}
        name="active"
        defaultValue={!!provider?.active}
        render={({ field }) => (
          <ActiveWrapper active={field.value}>
            <Switch checked={field.value} data-test-id="is_active_id" onChange={field.onChange} />
            <StyledText data-test-id="connect-integration-form-active-text">
              {field.value ? 'Active' : 'Disabled'}
            </StyledText>
          </ActiveWrapper>
        )}
      />
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
  color: ${colors.white};
  margin-top: 16px;

  background: ${colors.B17};
  border-radius: 7px;
`;

const CircleArrowRightStyled = styled(CircleArrowRight)`
  cursor: pointer;
`;
