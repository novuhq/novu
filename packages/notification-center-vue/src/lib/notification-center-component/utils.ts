import { css } from '@emotion/css';
import { getStyleByPath, getDefaultTheme, getDefaultBellColors } from '@novu/notification-center';
import type { NotificationCenterContentComponentProps } from '@novu/notification-center';

export const calculateStyles = ({
  styles,
  theme: propsTheme,
  colorScheme,
}: Pick<NotificationCenterContentComponentProps, 'theme' | 'styles' | 'colorScheme'>) => {
  const { theme, common } = getDefaultTheme({
    colorScheme,
    theme: propsTheme,
  });
  const { bellColors } = getDefaultBellColors({
    colorScheme,
    bellColors: {},
  });

  return {
    popoverArrowClass: css(
      getStyleByPath({
        styles,
        path: 'popover.arrow',
        theme,
        common,
        colorScheme,
      })
    ),
    popoverDropdownClass: css(
      getStyleByPath({
        styles,
        path: 'popover.dropdown',
        theme,
        common,
        colorScheme,
      })
    ),
    bellButtonClass: css(
      getStyleByPath({
        styles,
        path: 'bellButton.root',
        theme,
        common,
        colorScheme,
      })
    ),
    gradientDotClass: css(
      getStyleByPath({
        styles,
        path: 'bellButton.dot',
        theme,
        common,
        colorScheme,
      })
    ),
    bellColors,
  };
};
