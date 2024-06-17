import styled from '@emotion/styled';
import { colors, IconNotifications } from '@novu/design-system';

export function NotificationCenterBell({ unseenCount }: { unseenCount?: number }) {
  return (
    <span style={{ position: 'relative' }}>
      <IconNotifications />
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
