import { Header } from '@mantine/core';
import { IconButton } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconHelpOutline, IconOutlineMenuBook } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FC } from 'react';
import { discordInviteUrl } from '../../../../pages/quick-start/consts';
import { useStudioWorkflowsNavigation } from '../../../../studio/hooks';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { BridgeMenuItems } from '../v2/BridgeMenuItems';
import { BackButton } from './BackButton';

export const LocalStudioHeader: FC = () => {
  const { goBack, shouldHideBackButton } = useStudioWorkflowsNavigation();

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
        <HStack gap="100">{!shouldHideBackButton && <BackButton onClick={goBack} />}</HStack>
        <HStack gap="100">
          <BridgeMenuItems />
          <IconButton
            Icon={IconOutlineMenuBook}
            as="a"
            href={'https://docs.novu.co?utm_campaign=local_studio'}
            target="_blank"
            rel="noopener noreferrer"
          />

          {/* This doesn't work because of Discord's popup blocker via the response header:
          Cross-Origin-Opener-Policy: same-origin-allow-popups. We will likely need a Javascript workaround for Discord's popup blocker. */}
          <IconButton Icon={IconHelpOutline} as="a" href={discordInviteUrl} target="_blank" rel="noopener noreferrer" />
        </HStack>
      </HStack>
    </Header>
  );
};
