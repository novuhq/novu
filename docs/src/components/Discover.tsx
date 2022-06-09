import React, { useContext } from 'react';
import { SidebarContext } from '../theme/DocPage';
import styles from './Discover.module.scss';
import { useColorMode } from '@docusaurus/theme-common';
import clsx from 'clsx';
import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';

const discoverData = {
  Overview: {
    darkIcon: '/img/discover/view.svg',
    lightIcon: '/img/discover/view-light.svg',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mi pulvinar aliquet in metus sit eget. Eu quam faucibus id tristique pretium, dolor gravida adipiscing. Lacus amet leo eleifend.',
  },
  Platform: {
    darkIcon: '/img/discover/stack.svg',
    lightIcon: '/img/discover/stack-light.svg',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mi pulvinar aliquet in metus sit eget. Eu quam faucibus id tristique pretium, dolor gravida adipiscing.',
  },
  'Notification Center': {
    darkIcon: '/img/discover/alarm.svg',
    lightIcon: '/img/discover/alarm-light.svg',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mi pulvinar aliquet in metus sit eget. Eu quam faucibus id tristique pretium, dolor gravida adipiscing.',
  },
  Community: {
    darkIcon: '/img/discover/multiple.svg',
    lightIcon: '/img/discover/multiple-light.svg',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mi pulvinar aliquet in metus sit eget. Eu quam faucibus id tristique pretium, dolor gravida adipiscing. ',
  },
};

function Items({ items, className }) {
  return (
    <ul className={className}>
      {items.map(({ label, docId }) => (
        <li key={docId}>{label}</li>
      ))}
    </ul>
  );
}

export default function Discover() {
  const sidebar = useContext(SidebarContext);
  const sidebarItems = sidebar.filter((item) => item.docId !== 'home');

  const { colorMode } = useColorMode();

  return (
    <div className={styles.discoverWrapper}>
      {sidebarItems.map(({ label, items }) => (
        <div className={styles.discoverInner} key={label}>
          <div className={styles.discoverContent}>
            <div
              className={clsx(
                styles.discoverIcon,
                colorMode === 'dark' ? styles.discoverIconDark : styles.discoverIconLight
              )}
            >
              <ThemedImage
                alt=""
                aria-hidden
                sources={{
                  light: useBaseUrl(discoverData[label].lightIcon),
                  dark: useBaseUrl(discoverData[label].darkIcon),
                }}
              />
            </div>
            <div>
              <h3 className={styles.discoverTitle}>{label}</h3>
              <p>{discoverData[label].description}</p>
            </div>
          </div>

          <Items className={styles.discoverItems} items={items} />
        </div>
      ))}
    </div>
  );
}
