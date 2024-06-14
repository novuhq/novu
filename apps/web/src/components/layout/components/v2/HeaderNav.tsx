import { ActionIcon, Header } from '@mantine/core';
import { IconHelpOutline } from '@novu/novui/icons';
import { Tooltip } from '@novu/design-system';
import { IS_DOCKER_HOSTED } from '../../../../config';
import { useBootIntercom } from '../../../../hooks';
import useThemeChange from '../../../../hooks/useThemeChange';
import { discordInviteUrl } from '../../../../pages/quick-start/consts';
import { css } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { useAuth } from '../../../../hooks/useAuth';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { NotificationCenterWidget } from '../NotificationCenterWidget';
import { HeaderMenuItems } from './HeaderMenuItems';

export function HeaderNav() {
  const { currentUser } = useAuth();
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
      <HStack flexWrap={'nowrap'} justifyContent="flex-end" gap={'100'}>
        <ActionIcon variant="transparent" onClick={() => toggleColorScheme()}>
          <Tooltip label={themeLabel}>
            <div>{themeIcon}</div>
          </Tooltip>
        </ActionIcon>
        <NotificationCenterWidget user={currentUser} />
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
      </HStack>
    </Header>
  );
}
