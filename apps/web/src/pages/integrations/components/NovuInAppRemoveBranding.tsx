import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Popover, Switch, Text, Button, useColorScheme } from '@novu/design-system';
import { ApiServiceLevelEnum } from '@novu/shared';
import { Group } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../../ee/billing/hooks/useSubscription';
import { ROUTES } from '../../../constants/routes';
import { IS_EE_AUTH_ENABLED } from '../../../config/index';

const SwitchWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const SwitchLabel = styled.div`
  color: ${({ theme }) => `${theme.colorScheme === 'dark' ? theme.white : theme.colors.gray[8]}`};
  font-size: 14px !important;
  font-weight: 700;
  margin: 5px auto 5px 0px;
  line-height: 17px;
`;

const PopoverContent = () => {
  const navigate = useNavigate();

  return (
    <Group spacing={8}>
      <Text>Upgrade your billing plan to remove Novu branding</Text>
      <Button
        size="xs"
        variant="light"
        onClick={() => {
          navigate(ROUTES.MANAGE_ACCOUNT_BILLING);
        }}
      >
        View plans
      </Button>
    </Group>
  );
};

export const NovuInAppRemoveBranding = ({ control }: { control: any }) => {
  const { apiServiceLevel } = useSubscription();
  const { colorScheme } = useColorScheme();

  if (!IS_EE_AUTH_ENABLED) {
    return null;
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    if (apiServiceLevel === ApiServiceLevelEnum.FREE) {
      // If it's a free tier, don't change the value, just show the popover
      e.preventDefault();

      return;
    }

    field.onChange(e.target.checked);
  };

  return (
    <Controller
      name="removeNovuBranding"
      control={control}
      defaultValue={false}
      render={({ field }) => (
        <SwitchWrapper>
          <SwitchLabel>Remove "Powered by Novu" branding</SwitchLabel>
          <Popover
            disabled={apiServiceLevel !== ApiServiceLevelEnum.FREE}
            position="top"
            withArrow={false}
            offset={12}
            styles={{
              dropdown: { backgroundColor: colorScheme === 'dark' ? '#1C1C1F !important' : 'transparent' },
            }}
            width={192}
            target={
              <Switch
                label={field.value ? 'Active' : 'Disabled'}
                data-test-id="remove-novu-branding"
                checked={field.value}
                onChange={(e) => onChange(e, field)}
              />
            }
            content={<PopoverContent />}
          />
        </SwitchWrapper>
      )}
    />
  );
};
