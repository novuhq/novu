import { Header } from '@mantine/core';
import { IconButton } from '@novu/novui';
import { Tooltip } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FC } from 'react';
import useThemeChange from '../../../../hooks/useThemeChange';
import { useStudioWorkflowsNavigation } from '../../../../studio/hooks';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { BridgeMenuItems } from '../v2/BridgeMenuItems';
import { BackButton } from './BackButton';

export const LocalStudioHeader: FC = () => {
  const { goBack, shouldHideBackButton } = useStudioWorkflowsNavigation();
  const { Icon, themeLabel, toggleColorScheme } = useThemeChange();

  return (
    <Header
      height={`${HEADER_NAV_HEIGHT}px`}
      className={css({
        position: 'sticky',
        top: 0,
        borderBottom: 'none !important',
        zIndex: 'docked !important', // !important is necessary to override Mantine's z-index
        padding: '50',
        // TODO: because this component is directly from mantine, it doesn't respect layer styles
        bgColor: 'surface.page !important',
      })}
    >
      <HStack justifyContent="space-between" width="full" display="flex">
        <HStack gap="100">{!shouldHideBackButton && <BackButton onClick={goBack} />}</HStack>
        <HStack gap="100">
          <BridgeMenuItems />
          <Tooltip label={themeLabel}>
            <IconButton variant="transparent" onClick={() => toggleColorScheme()} Icon={Icon} />
          </Tooltip>
          <IconButton
            Icon={IconOutlineMenuBook}
            title={'Go to docs'}
            as="a"
            href={'https://docs.novu.co?utm_campaign=local_studio'}
            target="_blank"
            rel="noopener noreferrer"
          />
        </HStack>
      </HStack>
    </Header>
  );
};
