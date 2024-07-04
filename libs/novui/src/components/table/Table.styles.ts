import { type TableStylesNames } from '@mantine/core';
import { css } from '../../../styled-system/css';

const tableStyles: Partial<Record<TableStylesNames, string>> = {
  tr: css({
    '& td': {
      textOverflow: 'ellipsis',
    },
  }),
  table: css({
    borderCollapse: 'collapse',
    borderSpacingX: '125',
    textStyle: 'text.main',
    '& tr td:first-of-type': {
      pr: '200',
    },
    '& tr th:first-of-type': {
      pr: '200',
    },
    '& tr td:last-child': {
      pr: '200',
    },
    '& tr th:last-child': {
      pr: '200',
    },
    '& thead tr': {
      borderBottom: 'solid',
      borderColor: 'table.header.border',
    },
    '& thead tr th': {
      fontWeight: 'regular',
      textAlign: 'left',
      color: 'typography.text.tertiary',
      borderBottom: 'none',
      borderSpacing: '0',
      py: '75',
    },
    '& tbody tr td': {
      // TODO: replace with token value
      maxWidth: '[100px]',
      // TODO: replace with token value
      height: '[80px]',

      color: 'typography.text.main',
      borderBottom: 'solid',
      borderColor: 'table.row.border',
    },
    '& tbody tr[data-disabled="true"]:hover': {
      cursor: 'default',
    },
    '& tbody tr[data-disabled="false"]:hover': {
      cursor: 'pointer',
    },
    '& tbody tr:last-of-type td': {
      borderBottom: 'solid',
      borderColor: 'table.bottom.border',
    },
    _hover: {
      '& tbody tr:hover': {
        bg: 'table.row.surface.hover',
      },
    },
  }),
};

export default tableStyles;
