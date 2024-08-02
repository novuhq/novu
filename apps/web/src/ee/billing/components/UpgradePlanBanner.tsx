import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMantineTheme, Stack } from '@mantine/core';
import { colors, Text, Button, When } from '@novu/design-system';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useSubscription } from '../hooks/useSubscription';
import { ContactSalesModal } from './ContactSalesModal';
import { ContactSalesButton } from './ContactSalesButton';

export function UpgradePlanBanner({ FeatureActivatedBanner }: { FeatureActivatedBanner: React.FC<any> }) {
  const { colorScheme } = useMantineTheme();
  const navigate = useNavigate();
  const [isContactSalesModalOpen, setIsContactSalesModalOpen] = useState(false);
  const { apiServiceLevel } = useSubscription();

  const isDark = colorScheme === 'dark';
  const showUpgrade = apiServiceLevel === ApiServiceLevelEnum.FREE;

  return (
    <>
      <Stack
        spacing={8}
        style={{
          borderRadius: '7px',
          marginBottom: '24px',
          padding: '24px',
          background: isDark ? colors.B20 : colors.B98,
          alignItems: 'center',
        }}
      >
        <When truthy={showUpgrade}>
          <Text mb={8} align={'center'} color={colors.B60}>
            Utilize i18n localization for translating notifications
          </Text>
          <Button onClick={() => navigate('/settings/billing')}>Upgrade plan</Button>
          <ContactSalesButton onContactSales={() => setIsContactSalesModalOpen(true)} />
        </When>
        <When truthy={!showUpgrade}>
          <FeatureActivatedBanner />
        </When>
      </Stack>

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
