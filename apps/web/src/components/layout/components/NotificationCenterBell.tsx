import styled from '@emotion/styled';
import { ColorScheme } from '@mantine/core';
import { colors, IconNotifications } from '@novu/design-system';
import { NotificationBell } from '@novu/notification-center';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '../../../hooks';

export function NotificationCenterBell({
  unseenCount,
  colorScheme,
}: {
  unseenCount?: number;
  colorScheme: ColorScheme;
}) {
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  if (!isInformationArchitectureEnabled) {
    return <NotificationBell unseenCount={unseenCount} colorScheme={colorScheme} />;
  }

  return (
    <span style={{ position: 'relative' }}>
      <IconNotifications color={colors.B60} />
      {!!unseenCount && <StyledDot />}
    </span>
  );
}

const StyledDot = styled.div`
  position: absolute;
  top: -0.5rem;
  right: -0.125rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: ${colors.vertical};
  border: 2px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.white)};
`;
