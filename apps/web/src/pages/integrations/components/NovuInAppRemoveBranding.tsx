import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Switch, Tooltip } from '@novu/design-system';
import { useSubscription } from '../../../ee/billing/hooks/useSubscription';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '../../../hooks';

const InputWrapper = styled.div`
  > div {
    width: 100%;
  }
`;

const SwitchWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const SwitchDescription = styled.div`
  color: ${({ theme }) => `${theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6]}`};
  font-size: 14px !important;
  font-weight: 400;
  margin-top: '0px';
  margin-bottom: '10px';
  line-height: '17px';
`;

const SwitchLabel = styled.div`
  color: ${({ theme }) => `${theme.colorScheme === 'dark' ? theme.white : theme.colors.gray[8]}`};
  font-size: 14px !important;
  font-weight: 700;
  margin: 5px auto 5px 0px;
  line-height: 17px;
`;

export const NovuInAppRemoveBranding = ({ control }: { control: any }) => {
  const { apiServiceLevel } = useSubscription();
  const isImprovedBillingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_IMPROVED_BILLING_ENABLED);

  if (!isImprovedBillingEnabled) {
    return null;
  }

  return (
    <InputWrapper key="removeNovuBranding">
      <Controller
        name="removeNovuBranding"
        control={control}
        defaultValue={false}
        render={({ field }) => (
          <>
            <SwitchWrapper>
              <SwitchLabel>Remove Novu branding</SwitchLabel>
              <Tooltip
                disabled={apiServiceLevel !== ApiServiceLevelEnum.FREE}
                withinPortal={false}
                position="bottom"
                width={250}
                multiline
                label="Please upgrade your plan to enable this feature"
              >
                <span>
                  <Switch
                    label={field.value ? 'Active' : 'Disabled'}
                    data-test-id="remove-novu-branding"
                    disabled={apiServiceLevel === ApiServiceLevelEnum.FREE}
                    checked={field.value}
                    onChange={field.onChange}
                  />
                </span>
              </Tooltip>
            </SwitchWrapper>
            <SwitchDescription>Removes Novu branding from the Inbox when active</SwitchDescription>
          </>
        )}
      />
    </InputWrapper>
  );
};
