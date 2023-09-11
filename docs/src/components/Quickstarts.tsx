import React, { useState } from 'react';
import styles from './Quickstarts.module.scss';
import Link from '@docusaurus/Link';

import ReactLogo from '/static/img/quickstarts/reactjs.svg';
import VueLogo from '/static/img/quickstarts/vue.svg';
import AngularLogo from '/static/img/quickstarts/angular.svg';
import PhpLogo from '/static/img/quickstarts/php.svg';
import NextLogo from '/static/img/quickstarts/nextjs.svg';
import NodeLogo from '/static/img/quickstarts/nodejs.svg';
import VanillaLogo from '/static/img/quickstarts/vanillajs.svg';
import KotlinLogo from '/static/img/quickstarts/kotlin.svg';
import RubyLogo from '/static/img/quickstarts/ruby.svg';
import DotnetLogo from '/static/img/quickstarts/dotnet.svg';
import NovuLogo from '/static/img/quickstarts/novu.svg';
import ArrowIcon from '/static/img/arrow-md.svg';

const quickstartItems = [
  {
    title: 'ReactJS',
    description: 'Connect a ReactJS application to Novu',
    icon: ReactLogo,
    href: '/overview/quickstart/get-started-with-react',
  },
  {
    title: 'Vue',
    description: 'Connect a Vue application to Novu',
    icon: VueLogo,
    href: '/overview/quickstart/get-started-with-vue',
  },
  {
    title: 'Angular',
    description: 'Connect an Angular application to Novu',
    icon: AngularLogo,
    href: '/overview/quickstart/get-started-with-angular',
  },
  {
    title: 'PHP',
    description: 'Connect a PHP application to Novu',
    icon: PhpLogo,
    href: '/overview/quickstart/get-started-with-php',
  },
  {
    title: 'NextJS',
    description: 'Connect a NextJS application to Novu',
    icon: NextLogo,
    href: '/overview/quickstart/get-started-with-nextjs',
  },
  {
    title: 'NodeJS',
    description: 'Connect a NodeJS application to Novu',
    icon: NodeLogo,
    href: '/overview/quickstart/get-started-with-node.js',
  },
  {
    title: 'VanillaJS',
    description: 'Connect a VanillaJS application to Novu',
    icon: VanillaLogo,
    href: '/overview/quickstart/get-started-with-vanilla-js',
  },
  {
    title: 'Kotlin',
    description: 'Connect a Kotlin application to Novu',
    icon: KotlinLogo,
    href: '/overview/quickstart/get-started-with-kotlin',
  },
  {
    title: 'Ruby',
    description: 'Connect a Ruby application to Novu',
    icon: RubyLogo,
    href: '/overview/quickstart/get-started-with-ruby',
  },
  {
    title: '.Net',
    description: 'Connect a .Net application to Novu',
    icon: DotnetLogo,
    href: '/overview/quickstart/get-started-with-dotnet',
  },
  {
    title: 'General',
    description: 'Explore the General Quickstart guide',
    icon: NovuLogo,
    href: '/overview/quickstart/general-quickstart',
  },
];

export default function Quickstarts() {
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredItems = quickstartItems.filter((_, index) => isExpanded || index < 4);

  return (
    <div className={styles.quickstartsWrapper}>
      <ul className={styles.quickstartsItems}>
        {filteredItems.map(({ title, icon: Icon, description, href }, index) => (
          <li key={index}>
            <Link href={href} className={styles.quickstartsItem}>
              <Icon className={styles.quickstartsItem__logo} />
              <h3 className={styles.quickstartsItem__title}>{title}</h3>
              <p className={styles.quickstartsItem__description}>{description}</p>
              <span className={styles.quickstartsItem__more}>
                Learn more <ArrowIcon />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!isExpanded && (
        <button onClick={() => setIsExpanded(true)} className={styles.quickstartsButton}>
          <span>Show more</span>
        </button>
      )}
    </div>
  );
}
