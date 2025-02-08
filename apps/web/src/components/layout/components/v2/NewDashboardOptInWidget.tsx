import { Card } from '@mantine/core';
import { css } from '@novu/novui/css';
import { Text, Title, Button, IconButton } from '@novu/novui';
import { IconOutlineClose } from '@novu/novui/icons';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useEffect } from 'react';
import { IS_SELF_HOSTED } from '../../../../config';
import { useFeatureFlag } from '../../../../hooks';
import { useNewDashboardOptIn } from '../../../../hooks/useNewDashboardOptIn';
import { useSegment } from '../../../providers/SegmentProvider';

export function NewDashboardOptInWidget() {
  const { dismiss, optIn, status } = useNewDashboardOptIn();
  const segment = useSegment();

  const showWidget = !status && !IS_SELF_HOSTED;

  useEffect(() => {
    if (showWidget) {
      segment.track('New dashboard opt-in displayed - [WEB]');
    }
  }, [showWidget, segment]);

  if (!showWidget) {
    return null;
  }

  return (
    <Card shadow="sm" className={styles.card}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Title className={styles.title}>
            <span style={{ marginRight: '4px' }}>🎉</span> You're invited!
          </Title>
          <IconButton onClick={dismiss} Icon={IconOutlineClose} size="xs" />
        </div>
        <Text className={styles.text}>
          We’d love to extend you the access for the new workflows dashboard that we’re building.
        </Text>
      </div>
      <div className={styles.buttonContainer}>
        <Button size="sm" variant="transparent" onClick={optIn}>
          Take me there
        </Button>
      </div>
    </Card>
  );
}

const styles = {
  card: css({
    padding: '9px 16px !important',
    marginBottom: '16px',
    backgroundColor: 'surface.popover !important',
    borderTopLeftRadius: '100 !important',
    borderBottomLeftRadius: '100 !important',
    _before: {
      content: '""',
      position: 'absolute',
      width: '50',
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
      borderTopLeftRadius: '100',
      borderBottomLeftRadius: '100',
      bgGradient: `to-b`,
      gradientFrom: 'colorPalette.start',
      gradientTo: 'colorPalette.end',
    },
  }),
  content: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignSelf: 'stretch',
  }),
  header: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  }),
  title: css({
    fontSize: '12px',
    fontWeight: '700 ',
    lineHeight: '20px',
  }),
  text: css({
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: '500',
    fontStyle: 'normal',
  }),
  buttonContainer: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  }),
};
