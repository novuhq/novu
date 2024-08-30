import { css } from '@novu/novui/css';

export const clerkComponentAppearance = {
  elements: {
    navbar: { display: 'none' },
    navbarMobileMenuRow: { display: 'none !important' },
    cardBox: {
      display: 'block',
      width: 'full',
      height: 'full',
      boxShadow: 'none',
    },
  },
};

export const modalStyles = {
  modal: css({
    borderRadius: '150 !important',
    backgroundColor: 'surface.panel !important',
    padding: '0 !important',
    width: '[90%] !important',
    height: 'full !important',
  }),
  body: css({ height: 'full !important' }),
  header: css({ marginBottom: '0 !important' }),
  close: css({
    position: 'fixed !important',
    right: '[12px] !important',
    top: '[10px] !important',
    zIndex: '[2] !important',
  }),
};

export const titleTab = css({
  fontWeight: 'strong',
  color: 'typography.text.main !important',
  fontSize: 'x-large !important',
  lineHeight: '175 !important',
  opacity: '100 !important',
  margin: '0 !important',
  border: '0 !important',
  padding: '150 !important',
  '&:hover': {
    color: 'typography.text.main !important',
    backgroundColor: 'unset !important',
    borderColor: 'surface.panel !important',
    cursor: 'unset !important',
  },
});

export const billingTitle = css({
  fontSize: '125',
  letterSpacing: '0',
  lineHeight: '175',
});

export const normalTabStyle = css({
  fontWeight: 'strong',
  fontSize: '88 !important',
  color: 'typography.text.secondary !important',
  padding: '[8px 12px] !important',
  margin: '[4px]',
  border: 'unset !important',
  borderRadius: '[4px] !important',
  minWidth: '[204px]',
  '&:hover': {
    color: 'typography.text.main !important',
    backgroundColor: 'surface.panelSubsection !important',
  },
  '&[data-active="true"]': {
    color: 'typography.text.main !important',
    backgroundColor: 'surface.panelSubsection !important',
  },
});

export const tabsStyles = {
  root: css({ height: 'full' }),
  panel: css({
    padding: '150',
    borderRadius: 'l',
    backgroundColor: 'surface.panelSubsection',
    overflowY: 'auto',
  }),
  tabsList: css({
    borderRight: 'unset !important',
  }),
  tabIcon: css({
    marginRight: '[8px] !important',
  }),
};

export const tabIconStyle = css({ color: 'inherit' });
