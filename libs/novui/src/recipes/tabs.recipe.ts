import { TabsStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';

const SLOTS: TabsStylesNames[] = ['root', 'list', 'panel', 'tab', 'tabLabel', 'tabSection'];

export const TABS_RECIPE = defineSlotRecipe({
  className: 'tabs',
  jsx: ['Tabs'],
  slots: SLOTS,
  base: {
    root: {
      // default color palette
      colorPalette: 'mode.cloud',
    },
    list: {
      color: 'typography.text.main',
      gap: 'margins.layout.tabs.tab-tab',
      _before: {
        borderBottom: 'solid',
        borderColor: 'tabs.border',
      },
      marginBottom: 'margins.layout.tabs.bottom',
    },
    tab: {
      gap: 'margins.icons.Icon20-txt',
      padding: '0',
      paddingBottom: '75',
      color: 'typography.text.secondary',
      '& svg': {
        color: 'typography.text.secondary',
      },

      _disabled: {
        opacity: 'disabled',
      },

      _active: {
        color: 'typography.text.main',
        '& svg': {
          color: 'typography.text.main !important',
        },
        borderBottom: 'double',
        borderColor: 'colorPalette.start',
      },

      '&:hover:not(:disabled)': {
        background: 'none',
        color: 'typography.text.main',
        '& svg': {
          color: 'typography.text.main !important',
        },
      },
    },
    tabLabel: {
      fontSize: '88',
      fontWeight: 'strong',
      lineClamp: 1,
    },
    panel: {
      color: 'typography.text.main',
      fontSize: '88',
      lineHeight: '125',
    },
  },
});
