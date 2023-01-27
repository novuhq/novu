import React from 'react';
import { css, cx } from '@emotion/css';

import { Text, TextBlock } from './styles';
import { useStyles } from '../../../../store/styles';
import type { IThemeUserPreferences } from '../../../../store/novu-theme.context';

const preferencesTitleClassName = (theme) => css`
  color: ${theme?.accordion?.fontColor};
`;

const preferencesChannelsClassName = (theme) => css`
  color: ${theme?.accordion?.secondaryFontColor};
`;

export const WorkflowHeader = ({
  theme,
  label,
  channels,
}: {
  theme: IThemeUserPreferences;
  label: string;
  channels: string;
}) => {
  const [itemTitleStyles, itemChannelsStyles] = useStyles(['preferences.item.title', 'preferences.item.channels']);

  return (
    <TextBlock>
      <Text
        size={'lg'}
        className={cx('nc-preferences-item-title', preferencesTitleClassName(theme), css(itemTitleStyles))}
      >
        {label}
      </Text>
      <Text
        data-test-id="workflow-active-channels"
        size={'sm'}
        className={cx('nc-preferences-item-channels', preferencesChannelsClassName(theme), css(itemChannelsStyles))}
      >
        {channels}
      </Text>
    </TextBlock>
  );
};
