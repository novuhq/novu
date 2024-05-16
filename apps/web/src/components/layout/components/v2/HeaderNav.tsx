import { ActionIcon, Group, Header } from '@mantine/core';

import { colors, IconHelpOutline, Tooltip } from '@novu/design-system';
import { IS_DOCKER_HOSTED } from '../../../../config';
import { useBootIntercom } from '../../../../hooks';
import useThemeChange from '../../../../hooks/useThemeChange';
import { discordInviteUrl } from '../../../../pages/quick-start/consts';
import { css } from '../../../../styled-system/css';
import { useAuthContext } from '../../../providers/AuthProvider';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { NotificationCenterWidget } from '../NotificationCenterWidget';
import { HeaderMenuItems } from './HeaderMenuItems';

export function HeaderNav() {
  const { currentUser } = useAuthContext();
  const isSelfHosted = IS_DOCKER_HOSTED;

  useBootIntercom();
  const { themeIcon, themeLabel, toggleColorScheme } = useThemeChange();

  return (
    <Header
      height={`${HEADER_NAV_HEIGHT}px`}
      className={css({
        position: 'sticky',
        top: 0,
        borderBottom: 'none !important',
        // TODO: fix when we re-do z-index across the app
        zIndex: 199,
        padding: '50',
      })}
    >
      {/* TODO: Change position: right to space-between for breadcrumbs */}
      <Group position="right" noWrap align="center">
        <Group spacing={16}>
          <NotificationCenterWidget user={currentUser} />

          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()}>
            <Tooltip label={themeLabel}>
              <div>{themeIcon}</div>
            </Tooltip>
          </ActionIcon>
          {isSelfHosted ? (
            <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
              <ActionIcon variant="transparent">
                <IconHelpOutline />
              </ActionIcon>
            </a>
          ) : (
            <ActionIcon variant="transparent" id="intercom-launcher">
              <IconHelpOutline />
            </ActionIcon>
          )}
          <HeaderMenuItems />
        </Group>
      </Group>
    </Header>
  );
}
