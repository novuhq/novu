import { motion } from 'motion/react';

export function InboxBellFilled(props: React.ComponentPropsWithoutRef<'svg'>) {
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
        width="8"
        height="12"
        viewBox="0 0 8 12"
        fill="none"
        className={className}
        style={{ originX: 0.5, originY: 0.1, ...style }}
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
        {/* Bell Icon */}
        <motion.path
          d="M3.99961 0.859375C3.68354 0.859375 3.42818 1.14665 3.42818 1.50223V1.88795C2.12463 2.18527 1.1425 3.48304 1.1425 5.03795V5.41563C1.1425 6.35982 0.833576 7.27188 0.27644 7.97902L0.144299 8.14576C-0.00569888 8.3346 -0.0414127 8.6058 0.0496575 8.83683C0.140728 9.06786 0.346082 9.21652 0.571079 9.21652H7.42813C7.65313 9.21652 7.8567 9.06786 7.94955 8.83683C8.04241 8.6058 8.00491 8.3346 7.85491 8.14576L7.72277 7.97902C7.16564 7.27188 6.85671 6.36183 6.85671 5.41563V5.03795C6.85671 3.48304 5.87458 2.18527 4.57103 1.88795V1.50223C4.57103 1.14665 4.31567 0.859375 3.99961 0.859375ZM4.80852 10.7694C5.02281 10.5283 5.14245 10.2009 5.14245 9.85938H3.99961H2.85676C2.85676 10.2009 2.9764 10.5283 3.19069 10.7694C3.40497 11.0105 3.69604 11.1451 3.99961 11.1451C4.30317 11.1451 4.59424 11.0105 4.80852 10.7694Z"
          variants={{
            rest: {
              fill: '#525866',
            },
            hover: {
              fill: ['#525866', '#6b7280', '#8b949e', '#525866'],
              transition: {
                duration: 0.6,
                times: [0, 0.4, 0.7, 1],
                ease: 'easeInOut',
              },
            },
          }}
        />
      </motion.svg>
    </motion.div>
  );
}
