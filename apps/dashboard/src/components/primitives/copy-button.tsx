import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { RiCheckLine, RiFileCopyLine } from 'react-icons/ri';
import { cn } from '../../utils/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

type CopyButtonProps = {
  className?: string;
  valueToCopy: string;
  size?: '2xs' | 'xs';
};

export const CopyButton = (props: CopyButtonProps) => {
  const { className, valueToCopy, size, ...rest } = props;

  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const sizeClass = props.size === '2xs' ? 'size-3' : 'size-4';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            handleCopy();
            e.stopPropagation();
            e.preventDefault();
          }}
          className={cn(
            'inline-flex select-none items-center justify-center whitespace-nowrap p-2.5 outline-none',
            // colors
            'text-text-sub',
            // transitions
            'transition duration-200 ease-out',
            // hover
            'hover:bg-bg-weak',
            // focus
            className
          )}
          {...rest}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.1, bounce: 0.5 }}
              >
                <RiCheckLine className={`${sizeClass} text-success`} aria-hidden="true" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.15, bounce: 0.5 }}
              >
                <RiFileCopyLine className={`${sizeClass}`} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </TooltipTrigger>
      <TooltipContent className="px-2 py-1 text-xs" sideOffset={4}>
        {copied ? 'Copied!' : 'Click to copy'}
      </TooltipContent>
    </Tooltip>
  );
};
