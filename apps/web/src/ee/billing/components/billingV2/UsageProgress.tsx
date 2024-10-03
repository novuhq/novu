import { Text } from '@novu/novui';
import { Progress } from '@mantine/core';
import { css } from '@novu/novui/css';
import { IconError, IconWarning } from '@novu/novui/icons';
import { ApiServiceLevelEnum } from '@novu/shared';

export const UsageProgress = ({ apiServiceLevel, currentEvents, maxEvents }) => {
  const usagePercentage = (currentEvents / maxEvents) * 100;
  const color = getColorByUsagePercentage(usagePercentage);

  return (
    <div className={styles.usageProgress}>
      <WarningMessage usagePercentage={usagePercentage} apiServiceLevel={apiServiceLevel} />
      <Progress size="xs" value={usagePercentage} color={color} className={styles.progressBar} />
      <div className={styles.progressLegend}>
        <Text className={styles.legendItem}>0</Text>
        <Text className={styles.legendItem}>{maxEvents?.toLocaleString()}</Text>
      </div>
    </div>
  );
};

const WarningMessage = ({ usagePercentage, apiServiceLevel }) => {
  const color = getColorByUsagePercentage(usagePercentage);
  const { message, Icon } = getWarningContent(usagePercentage, apiServiceLevel);

  return message ? (
    <Text className={styles.warningMessage} style={{ color }}>
      {Icon && <Icon className={styles.warningIcon} size={16} style={{ color }} />}
      {message}
    </Text>
  ) : null;
};

const getWarningContent = (usagePercentage: number, apiServiceLevel: string) => {
  const isFreePlan = apiServiceLevel === ApiServiceLevelEnum.FREE;
  const isOverLimit = usagePercentage >= 100;
  const isNearLimit = usagePercentage >= 90;

  if (isOverLimit) {
    return {
      message: isFreePlan ? 'Notifications paused! Please upgrade.' : 'Plan free notifications limit reached.',
      Icon: IconError,
    };
  }

  if (isNearLimit) {
    return {
      message: 'Plan notifications limit almost reached!',
      Icon: IconWarning,
    };
  }

  return { message: '', Icon: null };
};

const getColorByUsagePercentage = (usagePercentage: number) => {
  if (usagePercentage >= 100) return '#F2555A';
  if (usagePercentage >= 90) return '#FFB224';
  return 'green';
};

const styles = {
  usageProgress: css({
    display: 'flex',
    height: '44px',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: '4px',
    alignSelf: 'stretch',
  }),
  warningMessage: css({
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '16px',
    gap: '4px',
  }),
  warningIcon: css({
    display: 'flex',
    alignItems: 'center',
  }),
  progressBar: css({
    display: 'flex',
    height: '4px',
    flexDirection: 'column',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    color: 'pink',
  }),
  progressLegend: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
  }),
  legendItem: css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    color: 'typography.text.secondary',
    fontSize: '12px',
    fontWeight: '600',
    lineHeight: '16px',
  }),
};
