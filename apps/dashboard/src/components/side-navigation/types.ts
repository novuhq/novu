export type NavItem = {
  label: string;
  icon: (...args: any[]) => JSX.Element;
  to?: string;
  disabled?: boolean;
  isExternal?: boolean;
};

export type NavItemsGroup = {
  label?: string;
  items: Array<NavItem>;
};
