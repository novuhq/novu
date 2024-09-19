import { Close, colors, Text, Warning, Button } from '@novu/design-system';
import { useMantineTheme, Group } from '@mantine/core';
import styled from '@emotion/styled/macro';
import { useLocalStorage } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import React, { useState, useMemo } from 'react';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useSubscription } from '../hooks/useSubscription';
import { warningLimitDays, COLOR_WARNING, pluralizeDaysLeft } from '../utils/freeTrial.constants';
import { ContactSalesModal } from './ContactSalesModal';
import { capitalize } from '../utils/capitalize';
import { useFeatureFlag } from '../../../hooks';

export function FreeTrialBanner() {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const { isFreeTrialActive, daysLeft, hasPaymentMethod, apiServiceLevel } = useSubscription();
  const [freeTrialDismissed, setFreeTrialDismissed] = useLocalStorage({
    key: 'freeTrialDismissed',
    defaultValue: 'false',
  });
  const navigate = useNavigate();
  const plan = useMemo(() => capitalize(apiServiceLevel), [apiServiceLevel]);
  const [isContactSalesModalOpen, setIsContactSalesModalOpen] = useState(false);
  const isImprovedBillingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_IMPROVED_BILLING_ENABLED);

  if (
    freeTrialDismissed === 'true' ||
    !isFreeTrialActive ||
    daysLeft > warningLimitDays(isImprovedBillingEnabled) ||
    hasPaymentMethod
  ) {
    return null;
  }

  const dismissBanner = () => {
    setFreeTrialDismissed('true');
  };

  return (
    <>
      <div
        style={{
          width: '100%',
          padding: 8,
          backgroundColor: COLOR_WARNING,
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
        data-test-id="free-trial-banner"
      >
        <Group spacing={24}>
          <Group spacing={8}>
            <Warning color={colors.black} />
            <Text color={colors.black}>
              Trial period expires in {pluralizeDaysLeft(daysLeft)}. Upgrade for continued access to {plan} features.
            </Text>
          </Group>
          <Group spacing={20}>
            <Button
              onClick={() => {
                navigate('/settings/billing');
              }}
              size="md"
              style={{
                height: 32,
              }}
              data-test-id="free-trial-banner-upgrade"
            >
              Upgrade
            </Button>

            <Button
              size="md"
              onClick={() => {
                setIsContactSalesModalOpen(true);
              }}
              style={{
                height: 32,
                background: isDark ? '#23232B' : colors.white,
              }}
              variant="outline"
              data-test-id="free-trial-banner-contact-sales"
            >
              Contact sales
            </Button>
          </Group>
        </Group>
        <CloseWrapper onClick={dismissBanner}>
          <Close height={13} width={13} color={colors.black} />
        </CloseWrapper>
      </div>
      <ContactSalesModal
        isOpen={isContactSalesModalOpen}
        onClose={() => {
          setIsContactSalesModalOpen(false);
        }}
        intendedApiServiceLevel={ApiServiceLevelEnum.BUSINESS}
      />
    </>
  );
}

const CloseWrapper = styled.a`
  float: right;
  position: absolute;
  right: 16px;
  top: 17.5px;
  font-size: 10px;
  &:hover {
    cursor: pointer;
  }
  svg {
    width: 13px;
  }
`;
