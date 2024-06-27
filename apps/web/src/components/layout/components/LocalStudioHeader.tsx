import { Header } from '@mantine/core';
import { IconButton, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconHelpOutline, IconOutlineArrowBack } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { hstack } from '@novu/novui/patterns';
import { FC } from 'react';
import { discordInviteUrl } from '../../../pages/quick-start/consts';
import { DocsButton } from '../../docs/DocsButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { HEADER_NAV_HEIGHT } from '../constants';
import { BridgeMenuItems } from './v2/BridgeMenuItems';

export const LocalStudioHeader: FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname.startsWith(ROUTES.STUDIO_ONBOARDING)) {
    return null;
  }

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
      <HStack justifyContent="space-between" width="full" display="flex">
        <HStack gap="100">
          {/** TODO temporary back-button. To be refined later */}
          <button
            className={hstack({
              cursor: 'pointer',
              gap: 'margins.icons.Icon20-txt',
              px: '75',
              py: '25',
              _hover: { opacity: 'hover' },
            })}
            onClick={() => navigate(-1)}
          >
            <IconOutlineArrowBack />
            <Text fontWeight="strong" color="typography.text.secondary">
              Back
            </Text>
          </button>
          <button onClick={() => navigate(ROUTES.STUDIO_ONBOARDING)}>onboarding</button>
        </HStack>
        <HStack gap="100">
          <BridgeMenuItems />
          <DocsButton />
          {/** TODO: this currently fails with Blocked opening in a new window
           * because the request was made in a sandboxed frame whose 'allow-popups' permission is not set. */}
          <IconButton Icon={IconHelpOutline} as="a" href={discordInviteUrl} target="_blank" rel="noopener noreferrer" />
        </HStack>
      </HStack>
    </Header>
  );
};
