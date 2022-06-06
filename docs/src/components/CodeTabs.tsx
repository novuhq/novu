import React, { useState } from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from './CodeTabs.module.scss';
import clsx from 'clsx';

export default function CodeTabs({ items }): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <div className={styles.tabsWrapper}>
        <ul className={styles.tabsList}>
          {items.map(({ name }, index) => (
            <li className={styles.tabItem} key={index}>
              <button
                className={clsx(styles.tabButton, activeIndex === index && styles.tabActiveButton)}
                onClick={() => setActiveIndex(index)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <CodeBlock language={items[activeIndex].language}>{items[activeIndex].code}</CodeBlock>
    </div>
  );
}
