import React from 'react';
import styles from './FAQ.module.scss';

interface IFaqProps {
  children: React.ReactNode;
}

export default function FAQ({ children }: IFaqProps) {
  return <ul className={styles.items_list}>{children}</ul>;
}
