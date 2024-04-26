import { css } from '@emotion/css';
import styled from '@emotion/styled';
import { createStyles, MantineTheme } from '@mantine/core';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '@novu/shared-web';
import { colors, shadows } from '../config';
import { NAVIGATION_WIDTH, LEGACY_NAVIGATION_WIDTH, COLLAPSED_WIDTH } from './Sidebar.const';
import { ISidebarBaseProps } from './Sidebar.types';

export const HeaderHolder = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  margin: 24px;
  margin-bottom: 0;
`;

export const scrollable = css`
  overflow-x: hidden;
  overflow-y: auto;
`;

export const BodyHolder = styled.div<{ isParentScrollable: boolean }>`
  display: flex;
  flex-direction: column;
  ${(props) => !props.isParentScrollable && scrollable};
  margin: 0 24px;
  gap: 24px;
  padding-right: 5px;
  margin-right: 19px;
  height: 100%;
`;

export const FooterHolder = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 24px;
  margin-top: 0;
  margin-top: auto;
`;

export const useDrawerStyles = createStyles(
  (theme: MantineTheme, { isExpanded }: Pick<ISidebarBaseProps, 'isExpanded'>) => {
    /**
     * TODO: Remove this feature flag and navigationWidth once the information architecture is enabled for all users
     */
    const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);
    const navigationWidth = isInformationArchitectureEnabled ? NAVIGATION_WIDTH : LEGACY_NAVIGATION_WIDTH;

    return {
      root: {
        position: 'absolute',
      },
      drawer: {
        position: 'fixed',
        top: 40,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
        borderTopLeftRadius: 7,
        borderBottomLeftRadius: 7,
        boxShadow: shadows.dark,
        width: isExpanded ? `calc(100% - ${navigationWidth}px)` : COLLAPSED_WIDTH,
        transition: 'all 300ms ease !important',
        '@media screen and (max-width: 768px)': {
          width: isExpanded ? `100%` : COLLAPSED_WIDTH,
        },
      },
      body: {
        height: '100%',
      },
    };
  }
);

export const sidebarDrawerContentClassName = css`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;
