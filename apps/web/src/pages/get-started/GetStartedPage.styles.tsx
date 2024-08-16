import { css } from '@novu/novui/css';

export const stepperClassNames = {
  separator: css({
    marginLeft: '50 !important',
    marginRight: '50 !important',
    position: 'relative !important',
    top: '-17px !important',
    backgroundColor: 'transparent !important',
    borderBottom: 'dashed',
    borderColor: { base: 'typography.text.main', _dark: 'table.header.border' },
    display: 'none !important',
  }),
  verticalSeparator: css({
    display: 'none !important',
  }),
  root: css({
    display: 'flex !important',
  }),
  steps: css({
    minWidth: '248px !important',
    width: '248px !important',
  }),
  stepWrapper: css({
    width: '40px !important',
    height: '40px !important',
  }),

  stepIcon: css({
    border: 'none !important',
    backgroundColor: 'transparent !important',
    color: 'typography.text.secondary !important',
    width: '20px !important',
    height: '20px !important',
    marginTop: '5px !important',
    '&[data-progress] svg': {
      color: {
        base: 'typography.text.main !important',
        _dark: '#fff !important',
      },
    },
    '&[data-progress]': {
      backgroundColor: 'transparent !important',
    },
    '&[data-completed] .mantine-Stepper-stepCompletedIcon': {},
    '&[data-completed] svg': {
      width: '14px !important',
      height: '14px !important',
    },
  }),
  stepBody: css({
    marginTop: '0 !important',
    marginLeft: '4px !important',
    width: '100% !important',
  }),
  stepDescription: css({
    marginTop: '4px !important',
    fontSize: '12px !important',
    marginBottom: '0 !important',
    lineHeight: '16px !important',
  }),
  stepCompletedIcon: css({
    backgroundColor: 'transparent !important',
    borderRadius: '200',
    color: {
      _dark: 'typography.text.main !important',
      base: 'typography.text.main !important',
    },
    '&[data-progress]': {
      backgroundColor: 'table.header.border !important',
      color: {
        _dark: 'typography.text.main !important',
        base: 'typography.text.main !important',
      },
    },
  }),
  stepLabel: css({
    fontSize: '16px !important',
    fontWeight: '600 !important',
    lineHeight: '24px !important',
    color: 'typography.text.secondary !important',
  }),
  step: css({
    padding: '16px !important',
    borderRadius: '12px !important',
    width: '100% !important',
    display: 'flex !important',
    minHeight: 'auto !important',
    '&[data-progress] .mantine-Stepper-stepLabel': {
      color: 'typography.text.main !important',
    },
    '&[data-progress] .mantine-Stepper-stepWrapper': {
      color: 'typography.text.main !important',
    },
    '&[data-progress]': {
      bg: {
        base: '#ededed !important',
        _dark: '#292933 !important',
      },
    },
    _hover: {
      cursor: 'pointer !important',
      color: 'white !important',
    },
  }),
  content: css({
    marginTop: '0px !important',
    paddingTop: '0 !important',
    paddingLeft: '40px !important',
  }),
};
