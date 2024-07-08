import { ActionIcon, Header } from '@mantine/core';
import { IconHelpOutline } from '@novu/novui/icons';
import { Tooltip } from '@novu/design-system';
import { IS_DOCKER_HOSTED } from '../../../../config';
import { useBootIntercom, useFeatureFlag } from '../../../../hooks';
import useThemeChange from '../../../../hooks/useThemeChange';
import { discordInviteUrl } from '../../../../pages/quick-start/consts';
import { css } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { useAuth } from '../../../../hooks/useAuth';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { NotificationCenterWidget } from '../NotificationCenterWidget';
import { HeaderMenuItems } from './HeaderMenuItems';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { BridgeMenuItems } from './BridgeMenuItems';
import { useStudioState } from '../../../../studio/StudioStateProvider';
import { WorkflowHeaderBackButton } from './WorkflowHeaderBackButton';

export function HeaderNav() {
  const { currentUser } = useAuth();
  const { bridgeURL } = useStudioState();

  const isSelfHosted = IS_DOCKER_HOSTED;
  const isV2ExperienceEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_EXPERIENCE_ENABLED);

  const shouldShowNewNovuExperience = isV2ExperienceEnabled && bridgeURL;

  useBootIntercom();

  const { themeIcon, themeLabel, toggleColorScheme } = useThemeChange();

  return (
    <Header
      height={`${HEADER_NAV_HEIGHT}px`}
      className={css({
        position: 'sticky',
        top: 0,
        borderBottom: 'none !important',
        zIndex: 'sticky',
        padding: '50',
      })}
    >
      {/* TODO: Change position: right to space-between for breadcrumbs */}
      <HStack justifyContent="space-between" width="full" display="flex">
        <HStack gap="100">{shouldShowNewNovuExperience && <WorkflowHeaderBackButton />}</HStack>
        <HStack flexWrap={'nowrap'} justifyContent="flex-end" gap={'100'}>
          {shouldShowNewNovuExperience && <BridgeMenuItems />}
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
      </HStack>
    </Header>
  );
}
