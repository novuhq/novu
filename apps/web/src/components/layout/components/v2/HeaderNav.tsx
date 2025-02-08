import { useEffect, useState } from 'react';
import { ActionIcon, Header } from '@mantine/core';
import {
  IconHelpOutline,
  IconOutlineChat,
  IconOutlineLibraryBooks,
  IconOutlineGroup,
  IconOutlineMail,
} from '@novu/novui/icons';
import { Tooltip, Dropdown } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { captureException } from '@sentry/react';
import { IS_EE_AUTH_ENABLED, IS_NOVU_PROD_STAGING } from '../../../../config';
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
import { SupportModal } from '../SupportModal';

export function HeaderNav() {
  const { currentUser, currentOrganization } = useAuth();
  const [isSupportModalOpened, setIsSupportModalOpened] = useState(false);

  useBootIntercom();
  // variable to check if it's the first render for. Needed for Plain live chat initialization
  const [isFirstRender, setIsFirstRender] = useState(true);
  const isLiveChatVisible =
    process.env.REACT_APP_PLAIN_SUPPORT_CHAT_APP_ID &&
    IS_NOVU_PROD_STAGING &&
    currentOrganization?.apiServiceLevel !== 'free' &&
    currentUser?.servicesHashes?.plain;

  const { Icon, themeLabel, toggleColorScheme } = useThemeChange();

  const toggleSupportModalShow = () => {
    setIsSupportModalOpened((previous) => !previous);
  };

  useEffect(() => {
    if (isLiveChatVisible && isFirstRender) {
      try {
        // @ts-ignore
        window?.Plain?.init({
          appId: process.env.REACT_APP_PLAIN_SUPPORT_CHAT_APP_ID,
          hideLauncher: true,
          hideBranding: true,
          title: 'Chat with us',
          links: [
            {
              icon: 'pencil',
              text: 'Roadmap',
              url: 'https://roadmap.novu.co/roadmap?utm_campaign=in_app_live_chat',
            },
            {
              icon: 'support',
              text: 'Contact Sales',
              url: 'https://notify.novu.co/meetings/novuhq/novu-discovery-session-rr?utm_campaign=in_app_live_chat',
            },
          ],
          entryPoint: 'default',
          theme: 'light',
          logo: {
            url: 'https://dashboard.novu.co/static/images/novu.png',
            alt: 'Novu Logo',
          },
          customerDetails: {
            fullName: `${currentUser.firstName} ${currentUser.lastName}`,
            email: currentUser?.email,
            emailHash: currentUser?.servicesHashes?.plain,
            externalId: currentUser?._id,
          },
        });
      } catch (error) {
        console.error('Error initializing plain chat: ', error);
        captureException(error);
      }
    }
    setIsFirstRender(false);
  }, [isLiveChatVisible, currentUser, isFirstRender]);

  const showLiveChat = () => {
    if (isLiveChatVisible) {
      try {
        // @ts-ignore
        window?.Plain?.open();
      } catch (error) {
        console.error('Error opening plain chat: ', error);
        captureException(error);
      }
    }
  };

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
          {<BridgeMenuItems />}
          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()}>
            <Tooltip label={themeLabel}>
              <div>
                <Icon title="color-scheme-preference-icon" />
              </div>
            </Tooltip>
          </ActionIcon>

          {/* Ugly fallback to satisfy the restrictive typings of the NotificationCenterWidget */}

          {IS_NOVU_PROD_STAGING ? (
            <Dropdown
              control={
                <ActionIcon variant="transparent">
                  <IconHelpOutline />
                </ActionIcon>
              }
            >
              <Dropdown.Item>
                <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                  <HStack>
                    <IconOutlineGroup /> Join us on Discord
                  </HStack>
                </a>
              </Dropdown.Item>
              <Dropdown.Item>
                <a href={'https://docs.novu.co'} target="_blank" rel="noopener noreferrer">
                  <HStack>
                    <IconOutlineLibraryBooks /> Documentation
                  </HStack>
                </a>
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => {
                  toggleSupportModalShow();
                }}
              >
                <HStack>
                  <IconOutlineMail /> Contact Us
                </HStack>
              </Dropdown.Item>
              {isLiveChatVisible && (
                <Dropdown.Item
                  onClick={() => {
                    showLiveChat();
                  }}
                >
                  <HStack>
                    <IconOutlineChat /> Live Chat
                  </HStack>
                </Dropdown.Item>
              )}
            </Dropdown>
          ) : (
            <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
              <ActionIcon variant="transparent">
                <IconHelpOutline />
              </ActionIcon>
            </a>
          )}
          <NotificationCenterWidget user={currentUser || undefined} />
          {IS_EE_AUTH_ENABLED ? <UserProfileButton /> : <HeaderMenuItems />}
        </HStack>
      </HStack>
      <SupportModal isOpen={isSupportModalOpened} toggleOpen={toggleSupportModalShow} />
    </Header>
  );
}
