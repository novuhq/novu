import { FC, forwardRef, ReactNode } from 'react';
import { CoreProps, LocalizedMessage } from 'src/types';
import { JsxStyleProps } from '../../../styled-system/types';
import { tabs } from '../../../styled-system/recipes';
import { splitCssProps } from '../../../styled-system/jsx';
import { Tabs as ExternalTabs, type TabsProps as ExternalTabsProps } from '@mantine/core';
import { css, cx } from '../../../styled-system/css';
import { PolymorphicRef } from '../../types/props-helpers';

interface ITabProps<TTabType extends string = string> {
  value: TTabType;
  label: LocalizedMessage;
  content?: ReactNode;
  icon?: ReactNode;
}

export interface ITabsProps<TTabType extends string = string>
  extends JsxStyleProps,
    CoreProps,
    Pick<ExternalTabsProps, 'keepMounted'> {
  value?: TTabType;
  defaultValue?: TTabType;
  onTabChange: (tab: TTabType) => void;
  tabConfigs: ITabProps[];
}

export const Tabs = forwardRef(
  <TTabType extends string = string>(props: ITabsProps<TTabType>, ref?: PolymorphicRef<'div'>) => {
    const [variantProps, tabsProps] = tabs.splitVariantProps({ ...props });
    const [cssProps, localProps] = splitCssProps(tabsProps);
    const { onTabChange, className, tabConfigs, ...otherProps } = localProps;
    const styles = tabs(variantProps);

    return (
      <ExternalTabs
        ref={ref}
        onChange={(newTab: string) => onTabChange(newTab as TTabType)}
        orientation="horizontal"
        variant="default"
        classNames={styles}
        className={cx(css(cssProps), className)}
        {...otherProps}
      >
        <ExternalTabs.List>
          {tabConfigs.map((menuTab, i) => (
            <ExternalTabs.Tab value={menuTab.value} leftSection={menuTab.icon} key={`tab-${menuTab.value}`}>
              {menuTab.label}
            </ExternalTabs.Tab>
          ))}
        </ExternalTabs.List>
        {tabConfigs.map((menuTab, i) => (
          <ExternalTabs.Panel value={menuTab.value} key={`tab-panel-${menuTab.value}`}>
            {menuTab.content}
          </ExternalTabs.Panel>
        ))}
      </ExternalTabs>
    );
  }
);
