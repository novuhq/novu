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
      gap: 'margins.layout.tabs.tab-tab !important',
      _before: {
        borderBottom: 'solid !important',
        borderColor: 'tabs.border !important',
      },
      marginBottom: 'margins.layout.tabs.bottom',
    },
    tab: {
      gap: 'margins.icons.Icon20-txt',
      padding: '0 !important',
      paddingBottom: '75 !important',
      color: 'typography.text.secondary !important',
      '& svg': {
        color: 'typography.text.secondary !important',
      },

      _disabled: {
        opacity: 'disabled',
      },

      _active: {
        color: 'typography.text.main !important',
        '& svg': {
          color: 'typography.text.main !important',
        },
        border: 'double',
        borderColor: 'colorPalette.start !important',
      },

      '&:hover:not(:disabled)': {
        background: 'none !important',
        color: 'typography.text.main !important',
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
