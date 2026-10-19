import { motion } from 'motion/react';
import React from 'react';

export function InboxBell(props: React.ComponentPropsWithoutRef<'svg'>) {
  const { className, style, ...restProps } = props;

  return (
    <motion.div
      className="inline-flex items-center justify-center"
      whileHover="hover"
      initial="rest"
      variants={{
        rest: {},
        hover: {},
      }}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
        className={className}
        style={{ originX: 0.5, originY: 0.2, ...style }}
        variants={{
          rest: {
            scale: 1,
            rotate: 0,
          },
          hover: {
            scale: [1, 1.15, 1.05, 1.1],
            rotate: [0, -8, 8, -4, 4, 0],
            transition: {
              duration: 0.6,
              ease: 'easeInOut',
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
            },
          },
        }}
      >
        <motion.path
          fill="currentColor"
          d="M8 14.667c.733 0 1.333-.6 1.333-1.333H6.667c0 .733.6 1.333 1.333 1.333m4-4V7.334c0-2.047-1.087-3.76-3-4.214v-.453c0-.553-.447-1-1-1s-1 .447-1 1v.453c-1.907.454-3 2.16-3 4.214v3.333L2.667 12v.667h10.666V12zm-1.333.667H5.333v-4c0-1.654 1.007-3 2.667-3s2.667 1.346 2.667 3z"
          variants={{
            rest: {
              fill: 'currentColor',
            },
            hover: {
              fill: 'currentColor',
              transition: {
                duration: 0.6,
                ease: 'easeInOut',
              },
            },
          }}
        />
      </motion.svg>
    </motion.div>
  );
}
