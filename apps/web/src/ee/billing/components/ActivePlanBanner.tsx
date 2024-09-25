import React from 'react';
import { Text, Title } from '@novu/novui';
import { Badge, Progress, Button, useMantineTheme } from '@mantine/core';
import { css } from '@novu/novui/css';
import { IconError } from '@novu/novui/icons';

export const ActivePlanBanner = () => {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';

  return (
    <div className={cardStyle}>
      <div className={planDetails}>
        <div className={titleHeader}>
          <Title variant="section">Business</Title>
          <Badge
            size="sm"
            sx={{
              background: '#2E2E32',
              display: 'flex',
              padding: '2px 8px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              color: '#7E7D86',
            }}
          >
            Trial
          </Badge>
          <div className={daysLeftContainer}>
            <Text className={remainingDays}>27</Text>
            <Text className={titleTextStyle}>days left</Text>
          </div>
        </div>

        <div className={infoContainer}>
          <div className={eventsInfoContainer}>
            <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '4px' })}>
              <Text
                className={css({
                  fontSize: '16px',
                  fontWeight: '600',
                  lineHeight: '24px',
                })}
              >
                200,000
              </Text>
              <Text
                className={css({
                  color: 'typography.text.secondary',
                  fontSize: '14px',
                  fontWeight: '400',
                  lineHeight: '20px',
                })}
              >
                events
              </Text>
            </div>
            <Text
              className={css({
                color: 'typography.text.secondary',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: '20px',
              })}
            >
              used this month
            </Text>
          </div>

          <div className={progressBarContainer}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'stretch' })}>
              <Text className={warningText}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconError size={16} color="#E5484D" />
                  Notifications paused! Upgrade
                </span>
              </Text>
            </div>

            <div className={progressBarContainer2}>
              <Progress size="xs" value={70} color="green" className={progressBar} />
              <div className={legendContainer}>
                <Text className={legendItem}>0</Text>
                <Text className={legendItem}>200,000</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={upgradePlanContainer}>
        <Button classNames={buttonStyle}>Upgrade plan</Button>
        <div
          className={css({
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '16px',
          })}
        >
          <Text variant="secondary" fontSize="14px" color="typography.text.secondary">
            Trial ends on 2024-07-15
          </Text>
          <Button classNames={viewInvoicesButton}>View invoices</Button>
        </div>
      </div>
    </div>
  );
};

const warningText = css({
  color: '#E5484D',
  fontSize: '12px',
  fontWeight: '400',
  lineHeight: '16px',
});

const viewInvoicesButton = {
  root: css({
    display: 'flex',
    height: '32px',
    padding: '0px 12px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '8px',
  }),
  label: css({
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
  }),
};

const buttonStyle = {
  root: css({
    height: '32px !important',
    padding: '0px 12px !important',
    borderRadius: '8px !important',
    background: '#2A92E7 !important',
  }),
  label: css({
    fontSize: '14px !important',
    fontWeight: '400 !important',
    lineHeight: '20px !important',
  }),
};

const upgradePlanContainer = css({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  alignSelf: 'stretch',
});

const legendContainer = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  alignSelf: 'stretch',
});

const legendItem = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '4px',
  color: 'typography.text.secondary',
  fontSize: '12px',
  fontWeight: '600',
  lineHeight: '16px',
});

const progressBarContainer = css({
  display: 'flex',
  height: '44px',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'flex-start',
  gap: '4px',
  alignSelf: 'stretch',
});

const progressBarContainer2 = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '4px',
  alignSelf: 'stretch',
});

const progressBar = css({
  display: 'flex',
  height: '4px',
  flexDirection: 'column',
  alignItems: 'flex-start',
  alignSelf: 'stretch',
});

const eventsInfoContainer = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
});

const infoContainer = css({
  display: 'flex',
  width: '240px',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '8px',
});

const daysLeftContainer = css({
  display: 'flex',
  gap: '6px', // Add some space between the elements
  alignItems: 'baseline', // Add this line to align text to the bottom
});

const remainingDays = css({
  color: 'typography.text.secondary',
  fontSize: '20px ',
  fontWeight: '600',
});

const titleTextStyle = css({
  color: 'typography.text.secondary',
  fontSize: '14px',
  fontWeight: '400',
  lineHeight: '1',
});

const titleHeader = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

const cardStyle = css({
  display: 'flex',
  width: '100%',
  padding: '24px',
  alignItems: 'flex-start',
  borderRadius: '16px',
  background: 'surface.panel',
  boxShadow: '0px 5px 20px 0px rgba(0, 0, 0, 0.2)',
  marginBottom: '24px', //TODO
});

const planDetails = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '24px',
  flex: '1 0 0',
});
