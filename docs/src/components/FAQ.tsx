import React, { useState } from 'react';
// import { motion } from 'framer-motion';
import styles from './FAQ.module.css';
import clsx from 'clsx';
import ChevronIcon from '/img/chevron-black.svg';

console.log(styles);
const TITLE = 'FAQ component';
const DESCRIPTION =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Porttitor enim, tellus dolor eu. Aliquam metus, nibh pretium, egestas mauris. Imperdiet faucibus vivamus libero viverra.';

type FAQItem = {
  title: string;
  description: string;
};

const FAQItems: FAQItem[] = [
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

export default function FAQSection({ items }): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);

  const ANIMATION_DURATION = 0.2;

  const variantsAnimation = {
    hidden: { opacity: 0, height: 0, pointerEvents: 'none', overflow: 'hidden' },
    visible: { opacity: 1, height: 'auto', pointerEvents: 'auto', display: 'flex' },
  };

  const [isOpen, setIsOpen] = useState(false);

  const handleButtonClick = () => setIsOpen((currentState) => !currentState);

  return (
    <section className={styles.features}>
      <div className="container">
        <h2
          className="anchor anchorWithStickyNavbar_node_modules-@docusaurus-theme-classic-lib-next-theme-Heading-styles-module"
          id="faq-component"
        >
          {TITLE}
        </h2>

        <p>{DESCRIPTION}</p>

        <div className="faq__item">
          <ul className={styles.ul}>
            {FAQItems.map(({ title, description }, index) => (
              <li className="menu__list-item" key={index}>
                <h4
                  className="anchor anchorWithStickyNavbar_node_modules-@docusaurus-theme-classic-lib-next-theme-Heading-styles-module"
                  id={title}
                >
                  {title}
                  <button className={styles.button_item} onClick={handleButtonClick}>
                    <ChevronIcon
                      className={clsx(
                        'button-icon auto shrink-0 transition-transform duration-200',
                        isOpen && '-rotate-180'
                      )}
                    />
                  </button>
                </h4>

                <div
                  className="faq_item_discription"
                  initial="hidden"
                  animate={isOpen ? 'visible' : 'hidden'}
                  variants={variantsAnimation}
                  transition={{ duration: ANIMATION_DURATION }}
                >
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    /*
     * </div>
     *     <div className="py-6 lg:py-4 md:py-3">
     *     <button
     *       className="inline-flex w-full items-center space-x-1"
     *       type="button"
     *       onClick={handleButtonClick}
     *     >
     *       <div className="flex flex-grow items-center space-x-4">
     *         <Icon className="w-12 shrink-0 md:w-10 xs:w-8" />
     *         <span className="text-left text-2xl font-medium leading-none lg:text-xl md:text-lg">
     *           {title}
     *         </span>
     *       </div>
     *       <ChevronIcon
     *         className={clsx(
     *           'h-auto w-4 shrink-0 transition-transform duration-200 md:w-3 xs:w-2.5',
     *           isOpen && '-rotate-180'
     *         )}
     *       />
     *     </button>
     */

    /*
     *     <motion.div
     *       className="flex-col pl-16 md:pl-0"
     *       initial="hidden"
     *       animate={isOpen ? 'visible' : 'hidden'}
     *       variants={variantsAnimation}
     *       transition={{ duration: ANIMATION_DURATION }}
     *     >
     *       {items.map(({ subtitle, subItems }, index) => (
     *         <Fragment key={index}>
     *           {subtitle && (
     *             <div
     *               className="pt-8 text-xl font-medium lg:pt-6 lg:text-lg md:pt-4 md:text-base"
     *               key={index}
     *             >
     *               {subtitle}
     *             </div>
     *           )}
     *           <ul className="divide-y divide-solid divide-gray-5">
     *             {subItems.map(({ label, openSource, enterprise, subLabel }, index) => (
     *               <li
     *                 className="grid grid-cols-10 items-center gap-x-8 py-4 first:pt-8 lg:first:pt-6 md:grid-cols-6 md:gap-x-6 md:first:pt-4 sm:gap-x-4"
     *                 key={index}
     *               >
     *                 <span className="col-span-4 text-lg font-light md:col-span-2 md:text-base sm:text-sm sm:leading-normal">
     *                   {label}
     *                 </span>
     *                 <span className="col-span-3 flex justify-self-center md:col-span-2">
     *                   {openSource ? presentFeature : missingFeature}
     *                 </span>
     *                 <span className="col-span-3 flex justify-self-center md:col-span-2">
     *                   {enterprise ? presentFeature : missingFeature}
     *                 </span>
     *                 {subLabel && (
     *                   <div className="col-span-full mt-4 grid grid-cols-10 items-center gap-x-8 border-t border-gray-5 pt-4 first:pt-8 lg:first:pt-6 md:grid-cols-6 md:gap-x-6 md:first:pt-4 sm:gap-x-4">
     *                     <span className="col-span-4 pl-10 text-lg font-light lg:pl-8 md:col-span-2 md:pl-6 md:text-base sm:pl-4 sm:text-sm sm:leading-normal">
     *                       {subLabel.label}
     *                     </span>
     *                     <span className="col-span-3 flex justify-self-center md:col-span-2">
     *                       {subLabel.openSource ? presentFeature : missingFeature}
     *                     </span>
     *                     <span className="col-span-3 flex justify-self-center md:col-span-2">
     *                       {subLabel.enterprise ? presentFeature : missingFeature}
     *                     </span>
     *                   </div>
     *                 )}
     *               </li>
     *             ))}
     *           </ul>
     *         </Fragment>
     *       ))}
     *     </motion.div>
     *   </div>
     * );
     * };
     */

    // };
  );
}
