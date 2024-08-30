import { css } from '@novu/novui/css';

export const tableClassName = css({
  '& td': {
    py: '75',
  },
  '& tbody tr': {
    '&:first-of-type td': {
      borderBottom: 'solid',
      borderColor: 'table.header.border',
      // FIXME: Talk to Design about this. We're using a table but then breaking every rule
      py: '100',
    },
    '&:not(:first-of-type) td': {
      borderBottom: 'none',
    },
  },
  '& tbody tr td': {
    height: '[inherit]',
  },
  '& tbody tr:last-of-type td': {
    borderBottom: 'solid',
  },
  '& tr td:not(:first-child), & tr th:not(:first-child)': {
    pr: '0',
    pl: '175',
    // FIXME: width for switch columns should be based on content
    width: '[34px]',
  },
  '& tr td:last-child, & tr th:last-child': {
    pr: '0',
  },
  _hover: {
    '& tbody tr:hover': {
      bg: '[initial]',
    },
  },
});
