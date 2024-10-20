import { Close, colors, Text, Warning, Button } from '@novu/design-system';
import { useMantineTheme, Group } from '@mantine/core';
import styled from '@emotion/styled';
import { useLocalStorage } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import React, { useState, useMemo } from 'react';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useSubscription } from '../hooks/useSubscription';
import { COLOR_WARNING, WARNING_LIMIT_DAYS, pluralizeDaysLeft } from '../utils/freeTrial.constants';
import { ContactSalesModal } from './ContactSalesModal';
import { capitalize } from '../utils/capitalize';
import { ROUTES } from '../../../constants/routes';

export function FreeTrialBanner() {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const { trial, apiServiceLevel } = useSubscription();
  const [freeTrialDismissed, setFreeTrialDismissed] = useLocalStorage({
    key: 'freeTrialDismissed',
    defaultValue: 'false',
  });
  const navigate = useNavigate();
  const plan = useMemo(() => capitalize(apiServiceLevel), [apiServiceLevel]);
  const [isContactSalesModalOpen, setIsContactSalesModalOpen] = useState(false);

  if (freeTrialDismissed === 'true' || !trial.isActive || trial.daysLeft > WARNING_LIMIT_DAYS) {
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
              Trial period expires in {pluralizeDaysLeft(trial.daysLeft)}. Upgrade for continued access to {plan}{' '}
              features.
            </Text>
          </Group>
          <Group spacing={20}>
            <Button
              onClick={() => {
                navigate(ROUTES.MANAGE_ACCOUNT_BILLING);
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
