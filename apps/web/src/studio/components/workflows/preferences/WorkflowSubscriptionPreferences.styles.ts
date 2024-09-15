import { css } from '@novu/novui/css';

export const tableClassName = css({
  '& td': {
    py: '75',
  },
  '& tbody tr': {
    '&:first-of-type td': {
      borderBottom: 'solid',
      borderColor: 'table.header.border',
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
    width: '275',
  },
  '& tr td:last-child, & tr th:last-child': {
    pr: '0 !important',
  },
  _hover: {
    '& tbody tr:hover': {
      bg: '[unset !important]',
    },
  },
});
