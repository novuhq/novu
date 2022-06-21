import React, { useContext } from 'react';
import { SidebarContext } from '../theme/DocPage';
import styles from './Discover.module.scss';
import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Link from '@docusaurus/Link';

const discoverData = {
  Overview: {
    darkIcon: '/img/discover/view.svg',
    lightIcon: '/img/discover/view-light.svg',
    description:
      'This is your starting point to Novu. Learn how you can quickly start using it and how you can self deploy it using Docker.',
  },
  Platform: {
    darkIcon: '/img/discover/stack.svg',
    lightIcon: '/img/discover/stack-light.svg',
    description:
      'Learn the building blocks of Novu, how you can create your first subscriber, integrate your delivery providers and deep dive to the Novu ecosystem. ',
  },
  'Notification Center': {
    darkIcon: '/img/discover/alarm.svg',
    lightIcon: '/img/discover/alarm-light.svg',
    description:
      'Quickly add a fully functioning notification center to your application using our component libraries or a custom iframe embed.',
  },
  Channels: {
    darkIcon: '/img/discover/transactions.svg',
    lightIcon: '/img/discover/transactions-light.svg',
    description:
      'With Novu you can send notification over multiple channels using a single API. Read more about our supported channels and recipes.',
  },
  Community: {
    darkIcon: '/img/discover/multiple.svg',
    lightIcon: '/img/discover/multiple-light.svg',
    description:
      'Novu is the only open-source notification infrastructure, join a community of thousands of developers. Learn about how you can contribute and stay in touch with our growing community.',
  },
};

function Items({ items, className }) {
  return (
    <ul className={className}>
      {items.map(({ label, href }) => (
        <li key={label}>
          <Link href={href}>{label}</Link>
        </li>
      ))}
    </ul>
  );
}

export default function Discover() {
  const sidebar = useContext(SidebarContext);
  const sidebarItems = sidebar.filter((item) => item.docId !== 'home');

  return (
    <div className={styles.discoverWrapper}>
      {sidebarItems.map(({ label, items }) => (
        <div className={styles.discoverInner} key={label}>
          <div className={styles.discoverContent}>
            <div className={styles.discoverIcon}>
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
