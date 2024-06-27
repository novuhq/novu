import { Header } from '@mantine/core';
import { IconButton } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconHelpOutline } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FC } from 'react';
import { matchPath, useLocation, useParams } from 'react-router-dom';
import { ROUTES } from '../../../../constants/routes';
import { discordInviteUrl } from '../../../../pages/quick-start/consts';
import { useStudioNavigate } from '../../../../studio/hooks/useStudioNavigate';
import { DocsButton } from '../../../docs/DocsButton';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { BridgeMenuItems } from '../v2/BridgeMenuItems';
import { BackButton } from './BackButton';

const HOME_ROUTE: ROUTES = ROUTES.STUDIO_FLOWS_VIEW;

export const LocalStudioHeader: FC = () => {
  const { pathname } = useLocation();
  const navigate = useStudioNavigate();
  const { templateId = '' } = useParams();

  const shouldHideBackButton = matchPath(HOME_ROUTE, pathname);

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
          {!shouldHideBackButton && <BackButton onClick={() => navigate(HOME_ROUTE, { templateId })} />}
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
