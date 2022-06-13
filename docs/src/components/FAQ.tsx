import React, { useState } from 'react';

import styles from './FAQ.module.css';
import clsx from 'clsx';

const TITLE = 'FAQ component';
const DESCRIPTION =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Porttitor enim, tellus dolor eu. Aliquam metus, nibh pretium, egestas mauris. Imperdiet faucibus vivamus libero viverra.';

type FAQItem = {
  title: string;
  description: string;
};

const FAQ_ITEMS: FAQItem[] = [
  {
    title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit?',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Adipiscing massa sed ultrices sed felis volutpat ac. Congue sit nibh sed ipsum, erat facilisis mauris. Amet, est urna facilisi tempus ut amet. Pharetra orci curabitur faucibus purus in nibh. Dolor, sodales malesuada nec vitae scelerisque leo convallis ac dictumst. Euismod.',
  },
  {
    title: 'Lorem ipsum dolor sit amet?',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Adipiscing massa sed ultrices sed felis volutpat ac. Congue sit nibh sed ipsum, erat facilisis mauris. Amet, est urna facilisi tempus ut amet. Pharetra orci curabitur faucibus purus in nibh. Dolor, sodales malesuada nec vitae scelerisque leo convallis ac dictumst. Euismod.',
  },
  {
    title: 'Lorem ipsum dolor sit amet?',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Adipiscing massa sed ultrices sed felis volutpat ac. Congue sit nibh sed ipsum, erat facilisis mauris. Amet, est urna facilisi tempus ut amet. Pharetra orci curabitur faucibus purus in nibh. Dolor, sodales malesuada nec vitae scelerisque leo convallis ac dictumst. Euismod.',
  },
];

export default function FAQ({ items }): JSX.Element {
  /*
   * const isDefaultOpen = false;
   * const [isOpen, setIsOpen] = useState(isDefaultOpen);
   * const handleButtonClick = () => setIsOpen((currentState) => !currentState);
   */

  /*
   * const BTNS = document.querySelectorAll('.item_btn');
   * const handleButtonClick = () => {
   *   this.classList.toggle('is-open');
   */

  //   const content = this.nextElementSibling;

  /*
   *   if (content.style.maxHeight) content.style.maxHeight = null;
   *   else content.style.maxHeight = content.scrollHeight + 'px';
   * };
   */

  return (
    <section className={styles.features}>
      <div className="container">
        <h2
          className="anchor anchorWithStickyNavbar_node_modules-@docusaurus-theme-classic-lib-next-theme-Heading-styles-module"
          id="faq-component"
        >
          {TITLE}
        </h2>

        <p className={styles.section_description}>{DESCRIPTION}</p>

        <ul className={styles.ul}>
          {FAQ_ITEMS.map(({ title, description }, index) => (
            <li className={styles.menu__list_item} key={index}>
              <button className={styles.item_btn} onClick={handleButtonClick}>
                <h4
                  className="anchor item_title anchorWithStickyNavbar_node_modules-@docusaurus-theme-classic-lib-next-theme-Heading-styles-module"
                  id={title}
                >
                  {title}
                </h4>
              </button>
              <div className={styles.item_content}>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
