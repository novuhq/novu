import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { Group } from '@mantine/core';
import { Switch, Text, Button, Popover } from '@novu/design-system';
import { IS_SELF_HOSTED } from '../../config';
import { ROUTES } from '../../constants/routes';
import { useSubscription } from '../../ee/billing/hooks/useSubscription';
import { ApiServiceLevelEnum } from '@novu/shared';

const SwitchWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const PopoverContent = () => {
  const navigate = useNavigate();

  return (
    <Group spacing={8}>
      <Text>
        {IS_SELF_HOSTED
          ? 'Upgrade to Cloud plans to remove Novu branding'
          : 'Upgrade your billing plan to remove Novu branding'}
      </Text>
      <Button
        size="xs"
        variant="light"
        onClick={() => {
          if (IS_SELF_HOSTED) {
            window.open('https://novu.co/pricing?utm_campaign=remove_branding_prompt', '_blank');
          } else {
            navigate(ROUTES.MANAGE_ACCOUNT_BILLING);
          }
        }}
      >
        {IS_SELF_HOSTED ? 'Upgrade Plan' : 'View plans'}
      </Button>
    </Group>
  );
};

type NovuBrandingSwitchProps = {
  id: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  isReadOnly?: boolean;
};

export function NovuBrandingSwitch({ id, value, onChange, isReadOnly }: NovuBrandingSwitchProps) {
  const { apiServiceLevel } = useSubscription();

  const isFreePlan = apiServiceLevel === ApiServiceLevelEnum.FREE;
  const disabled = isFreePlan || IS_SELF_HOSTED;
  const checked = disabled ? false : value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onChange(e.target.checked);
  };

  return (
    <SwitchWrapper>
      {isFreePlan || IS_SELF_HOSTED ? (
        <Popover
          disabled={!disabled}
          position="top"
          withArrow={false}
          offset={12}
          width={250}
          target={
            <Switch
              label={checked ? 'Active' : 'Disabled'}
              data-test-id="remove-novu-branding"
              checked={checked}
              onChange={handleChange}
              disabled={isReadOnly}
            />
          }
          content={<PopoverContent />}
        />
      ) : (
        <Switch
          label={checked ? 'Active' : 'Disabled'}
          data-test-id="remove-novu-branding"
          checked={checked}
          onChange={handleChange}
          disabled={isReadOnly}
        />
      )}
    </SwitchWrapper>
  );
}
