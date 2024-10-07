import { ActionIcon, Header } from '@mantine/core';
import { IconHelpOutline } from '@novu/novui/icons';
import { Tooltip } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_EE_AUTH_ENABLED, IS_SELF_HOSTED } from '../../../../config';
import { useBootIntercom, useFeatureFlag } from '../../../../hooks';
import useThemeChange from '../../../../hooks/useThemeChange';
import { discordInviteUrl } from '../../../../pages/quick-start/consts';
import { useAuth } from '../../../../hooks/useAuth';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { NotificationCenterWidget } from '../NotificationCenterWidget';
import { HeaderMenuItems } from './HeaderMenuItems';
import { UserProfileButton } from '../../../../ee/clerk';
import { BridgeMenuItems } from './BridgeMenuItems';
import { WorkflowHeaderBackButton } from './WorkflowHeaderBackButton';

export function HeaderNav() {
  const { currentUser } = useAuth();

  const isSelfHosted = IS_SELF_HOSTED;
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);

  useBootIntercom();

  const { Icon, themeLabel, toggleColorScheme } = useThemeChange();

  return (
    <Header
      height={`${HEADER_NAV_HEIGHT}px`}
      className={css({
        position: 'sticky',
        top: 0,
        borderBottom: 'none !important',
        zIndex: '200 !important',
        padding: '50',
      })}
    >
      {/* TODO: Change position: right to space-between for breadcrumbs */}
      <HStack justifyContent="space-between" width="full" display="flex">
        <HStack gap="100">
          <WorkflowHeaderBackButton />
        </HStack>
        <HStack flexWrap={'nowrap'} justifyContent="flex-end" gap={'100'}>
          {isV2Enabled && <BridgeMenuItems />}
          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()}>
            <Tooltip label={themeLabel}>
              <div>
                <Icon title="color-scheme-preference-icon" />
              </div>
            </Tooltip>
          </ActionIcon>
          {/* Ugly fallback to satisfy the restrictive typings of the NotificationCenterWidget */}
          <NotificationCenterWidget user={currentUser || undefined} />
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
      </HStack>
    </Header>
  );
}
