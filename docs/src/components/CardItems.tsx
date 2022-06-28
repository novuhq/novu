import clsx from 'clsx';
import React from 'react';
import styles from './CardItems.module.scss';
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
    <div className={styles.cardItem}>
      <div className={styles.cardImageWrapper}>
        <img
          src={`data:image/svg+xml;charset=utf-8,%3Csvg height='98' width='198' xmlns='http://www.w3.org/2000/svg' version='1.1'%3E%3C/svg%3E`}
          alt=""
          aria-hidden
        />
        <ThemedImage
          className={styles.cardImage}
          alt={title}
          sources={{
            light: useBaseUrl(imageLight),
            dark: useBaseUrl(imageDark),
          }}
          loading="eager"
          width={198}
          height={98}
        />
      </div>

      <span className={styles.cardTitle}>{title}</span>
    </div>
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
