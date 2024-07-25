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
  }),
  steps: css({
    maxWidth: '400px !important',
    margin: '0 auto !important',
  }),
  stepWrapper: css({
    width: '40px !important',
    height: '40px !important',
  }),

  stepIcon: css({
    border: 'none !important',
    backgroundColor: 'surface.popover !important',
    color: 'typography.text.secondary !important',
    width: '40px !important',
    height: '40px !important',
    '&[data-progress] svg': {
      color: {
        base: '#fff !important',
        _dark: '#23232B !important',
      },
    },
    '&[data-progress]': {
      backgroundColor: {
        base: '#616161 !important',
        _dark: 'white !important',
      },
    },
    '&[data-completed] .mantine-Stepper-stepCompletedIcon': {
      opacity: '0.6 !important',
    },
    '&[data-completed] svg': {
      width: '14px !important',
      height: '14px !important',
    },
  }),
  stepBody: css({
    marginTop: '8px !important',
    marginLeft: '0 !important',
    width: '100% !important',
  }),
  stepCompletedIcon: css({
    backgroundColor: 'typography.text.feedback.success',
    borderRadius: '200',
    '&[data-progress]': {
      backgroundColor: 'table.header.border !important',
      color: 'typography.text.main !important',
    },
  }),
  stepLabel: css({
    fontSize: '16px !important',
    fontWeight: '600 !important',
    textAlign: 'center !important',
    lineHeight: '24px !important',
    color: 'typography.text.secondary !important',
  }),
  step: css({
    display: 'flex !important',
    alignItems: 'center !important',
    justifyContent: 'center !important',
    flexDirection: 'column !important',
    '&[data-progress] .mantine-Stepper-stepLabel': {
      color: 'typography.text.main !important',
    },
    '&[data-progress] .mantine-Stepper-stepWrapper': {
      color: 'typography.text.main !important',
    },
    _hover: {
      cursor: 'pointer !important',
      color: 'white !important',
    },
  }),
  content: css({
    marginTop: '52px !important',
    paddingTop: '0 !important',
  }),
};
