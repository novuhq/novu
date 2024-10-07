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
    right: '75 !important',
    top: '[10px] !important',
    zIndex: 'docked !important',
  }),
};

export const titleTab = css({
  fontWeight: 'strong',
  color: 'typography.text.main !important',
  fontSize: '150 !important',
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
  marginBottom: '150',
});

export const normalTabStyle = css({
  fontWeight: 'strong',
  fontSize: '88 !important',
  color: 'typography.text.secondary !important',
  py: '50 !important',
  px: '75 !important',
  margin: '25 !important',
  border: 'unset !important',
  borderRadius: '50 !important',
  minWidth: 'userSettings.buttonWidth',
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
    backgroundColor: 'surface.page',
    overflowY: 'auto',
  }),
  tabsList: css({
    borderRight: 'unset !important',
  }),
  tabIcon: css({
    marginRight: '50 !important',
  }),
};

export const tabIconStyle = css({ color: 'inherit' });
