import React, { useState } from 'react';
import clsx from 'clsx';
import styles from './FAQItem.module.scss';
import Chevron from '/static/img/chevron-white-faq.svg';

interface faqItemProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
}

export default function FAQItem({ title, children, isOpen = false }: faqItemProps) {
  const [isItemOpen, setIsItemOpen] = useState(isOpen);

  const handleButtonClick = () => setIsItemOpen((previousValue) => !previousValue);

  return (
    <li className={styles.item}>
      <button className={styles.item_btn} onClick={handleButtonClick}>
        <h4 className={styles.item_title} id={title}>
          {title}
        </h4>
        <Chevron className={clsx(styles.button_icon, isItemOpen && styles.button_icon_is_open)} />
      </button>
      <div className={clsx(styles.item_content, isItemOpen && styles.item_content_is_open)}>
        {children}
      </div>
    </li>
  );
}
