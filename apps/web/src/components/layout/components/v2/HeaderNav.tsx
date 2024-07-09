import { ActionIcon, Header } from '@mantine/core';
import { IconHelpOutline, IconOutlineCloudUpload } from '@novu/novui/icons';
import { Tooltip } from '@novu/design-system';
import { Button } from '@novu/novui';
import { IS_EE_AUTH_ENABLED, IS_DOCKER_HOSTED } from '../../../../config';
import { useBootIntercom, useFeatureFlag } from '../../../../hooks';
import useThemeChange from '../../../../hooks/useThemeChange';
import { discordInviteUrl } from '../../../../pages/quick-start/consts';
import { css } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { useAuth } from '../../../../hooks/useAuth';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { NotificationCenterWidget } from '../NotificationCenterWidget';
import { HeaderMenuItems } from './HeaderMenuItems';
import { useLocation } from 'react-router-dom';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { UserProfileButton } from '../../../../ee/clerk';

export function HeaderNav() {
  const { currentUser } = useAuth();
  const isSelfHosted = IS_DOCKER_HOSTED;
  const location = useLocation();

  const isV2ExperienceEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_EXPERIENCE_ENABLED);

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
        {isV2ExperienceEnabled && (
          <Button size="xs" Icon={IconOutlineCloudUpload}>
            Sync
          </Button>
        )}
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
        {IS_EE_AUTH_ENABLED ? <UserProfileButton /> : <HeaderMenuItems />}
      </HStack>
    </Header>
  );
}
