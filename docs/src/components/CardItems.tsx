import clsx from 'clsx';
import React from 'react';
import styles from './CardItems.module.scss';
import { useColorMode } from '@docusaurus/theme-common';
import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';
type cardItem = {
  title: string;
  imageDark: string;
  imageLight: string;
};

const cardsItems: cardItem[] = [
  {
    title: 'Create template',
    imageDark: '/img/card-items/create-template.svg',
    imageLight: '/img/card-items/create-template-light.svg',
  },
  {
    title: 'Connect providers',
    imageDark: '/img/card-items/connect-providers.svg',
    imageLight: '/img/card-items/connect-providers-light.svg',
  },
  {
    title: 'Add trigger',
    imageDark: '/img/card-items/add-trigger.svg',
    imageLight: '/img/card-items/add-trigger-light.svg',
  },
];

function CardItem({ title, imageDark, imageLight }: cardItem) {
  return (
    <a className={styles.cardItem} href="/">
      <ThemedImage
        className={styles.cardImage}
        alt={title}
        sources={{
          light: useBaseUrl(imageLight),
          dark: useBaseUrl(imageDark),
        }}
      />
      <span className={styles.cardTitle}>{title}</span>
    </a>
  );
}

export default function CardItems() {
  return (
    <ul className={styles.cardItems}>
      {cardsItems.map((item, index) => (
        <CardItem key={index} {...item} />
      ))}
    </ul>
  );
}
