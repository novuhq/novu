import React, { useEffect } from 'react';
import { Group, Stack, useMantineTheme } from '@mantine/core';
import { Text, Title, colors, errorMessage, successMessage, When } from '@novu/design-system';
import { PaymentElement } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { Modal } from '@novu/design-system';
import { UpgradeSubmitButton } from './UpgradeSubmitButton';
import { useNavigate } from 'react-router-dom';
import { STRIPE_CLIENT_KEY } from '../utils/environment';
import { includedEventQuotaFromApiServiceLevel, pricePerThousandEvents } from '../utils/plan.constants';
import { ApiServiceLevelEnum } from '@novu/shared';
import { BillingIntervalControl } from './BillingIntervalControl';
import { StripeLogo } from './StripeLogo';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useSubscription } from '../utils/hooks/useSubscription';
import { formatCurrency } from '../utils/formatCurrency';
import { ContactSalesButton } from './ContactSalesButton';

const stripePromise = loadStripe(STRIPE_CLIENT_KEY);

export const UpgradeModal = ({
  intentSecret,
  onClose,
  onSucceeded,
  onContactSales,
  open,
  billingInterval,
  setBillingInterval,
  loading,
}: {
  intentSecret: string;
  onClose: () => void;
  onSucceeded: () => void;
  onContactSales: () => void;
  open: boolean;
  billingInterval: 'year' | 'month';
  setBillingInterval: (value: 'year' | 'month') => void;
  loading: boolean;
}) => {
  const { isFreeTrialActive, trialEnd } = useSubscription();
  const segment = useSegment();
  const { colorScheme } = useMantineTheme();
  const navigate = useNavigate();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    segment.track('Checkout Model Opened - Billing');

    stripePromise.then(async (stripe) => {
      const clientSecret = new URLSearchParams(window.location.search).get('setup_intent_client_secret');

      if (!stripe) {
        throw new Error('Stripe is not available');
      }

      if (clientSecret === null) {
        return;
      }

      const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret);

      switch (setupIntent?.status) {
        case 'succeeded':
          onSucceeded();
          successMessage('Success! Your payment method has been saved.');
          break;

        case 'processing':
          successMessage("Processing payment details. We'll update you when processing is complete.");
          break;

        case 'requires_payment_method':
          errorMessage('Failed to process payment details. Please try another payment method.');
          break;
      }

      navigate('/settings/billing', { replace: true });

      return;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!intentSecret || intentSecret.length === 0 || !open) {
    return null;
  }

  return (
    <Modal
      styles={{
        body: {
          paddingTop: '0px !important',
        },
        modal: {
          width: 840,
        },
      }}
      padding={0}
      withCloseButton={false}
      size="xl"
      opened={intentSecret.length > 0 && open}
      title={undefined}
      onClose={onClose}
    >
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: intentSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorBackground: isDark ? colors.B15 : colors.white,
              colorText: isDark ? colors.white : colors.B40,
              colorDanger: colors.error,
              spacingUnit: '4px',
              borderRadius: '8px',
              colorTextSecondary: isDark ? colors.B60 : colors.B40,
              colorTextPlaceholder: isDark ? colors.B40 : colors.B70,
              gridColumnSpacing: '16px',
              gridRowSpacing: '16px',
              fontSize3Xs: '14px',
              fontLineHeight: '17px',
            },
            rules: {
              '.Input': {
                borderColor: isDark ? colors.B30 : colors.B80,
              },
              '.Label': {
                fontWeight: '700',
              },
            },
          },
        }}
      >
        <Group align="strech" spacing={0}>
          <Stack
            style={{
              padding: 40,
              width: '60%',
            }}
            spacing={24}
          >
            <Title>Upgrade to Business</Title>
            <BillingIntervalControl value={billingInterval} onChange={(value) => setBillingInterval(value)} />
            <PaymentElement />
            <Group mt={-12} spacing={8}>
              <StripeLogo color={isDark ? colors.B60 : colors.B40} />
              <Text color={isDark ? colors.B60 : colors.B40}>secure all transactions</Text>
            </Group>
          </Stack>
          <div
            style={{
              padding: 40,
              width: '40%',
              background: isDark ? colors.B20 : colors.B98,
              borderTopRightRadius: 7,
              borderBottomRightRadius: 7,
            }}
          >
            <Stack>
              <div>
                <Title color={colors.B60} size={2}>
                  Order summary
                </Title>
                <Stack
                  style={{
                    marginTop: 24,
                    marginBottom: 24,
                  }}
                  spacing={20}
                  justify="space-between"
                >
                  <div>
                    <When truthy={billingInterval === 'year'}>
                      <Group data-test-id="modal-anually-pricing" position="apart">
                        <Text size={16} color={isDark ? undefined : colors.BGDark}>
                          Annual package
                        </Text>
                        <Text size={16} color={isDark ? undefined : colors.BGDark}>
                          ${formatCurrency(2700)}
                        </Text>
                      </Group>
                    </When>
                    <When truthy={billingInterval === 'month'}>
                      <Group data-test-id="modal-monthly-pricing" position="apart">
                        <Text size={16} color={isDark ? undefined : colors.BGDark}>
                          Monthly package
                        </Text>
                        <Text size={16} color={isDark ? undefined : colors.BGDark}>
                          $250
                        </Text>
                      </Group>
                    </When>
                    <Group position="apart">
                      <Text color={isDark ? colors.B80 : colors.B40} size={12}>
                        {includedEventQuotaFromApiServiceLevel[ApiServiceLevelEnum.BUSINESS].toLocaleString()} events
                        per month
                      </Text>
                      <When truthy={billingInterval === 'month'}>
                        <Text color={isDark ? colors.B80 : colors.B40} size={12}>
                          billed monthly
                        </Text>
                      </When>
                      <When truthy={billingInterval === 'year'}>
                        <Text color={isDark ? colors.B80 : colors.B40} size={12}>
                          billed annually
                        </Text>
                      </When>
                    </Group>
                  </div>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: isDark ? colors.B17 : colors.BGLight,
                    }}
                  >
                    <Text color={isDark ? colors.B80 : colors.BGDark}>
                      If you consume over{' '}
                      <b>{includedEventQuotaFromApiServiceLevel[ApiServiceLevelEnum.BUSINESS].toLocaleString()}</b>{' '}
                      events per month, you will be billed monthly for an overage based on the table below
                    </Text>
                  </div>
                  <div>
                    <Group position="apart">
                      <Text color={isDark ? colors.white : colors.BGDark} mb={8} size={14}>
                        Price per {(1000).toLocaleString()} events
                      </Text>
                      <Text color={isDark ? colors.white : colors.BGDark} mb={8} size={14}>
                        ${formatCurrency(pricePerThousandEvents)}
                      </Text>
                    </Group>
                  </div>
                </Stack>
                <When truthy={isFreeTrialActive}>
                  <Text style={{ paddingBottom: 8 }} color={isDark ? colors.B60 : colors.B40} size={12}>
                    Your payment method will be charged when your trial concludes on{' '}
                    {new Date(trialEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
                  </Text>
                </When>
                <UpgradeSubmitButton intervalChanging={loading} />
              </div>
              <ContactSalesButton onContactSales={onContactSales} label={'Contact our sales team'} />
            </Stack>
          </div>
        </Group>
      </Elements>
    </Modal>
  );
};
