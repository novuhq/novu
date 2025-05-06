import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { Slot, SlotProps } from '@radix-ui/react-slot';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

type TruncatedTextProps = SlotProps & { asChild?: boolean };

export default function TruncatedText(props: TruncatedTextProps) {
  const { className, children, asChild, ...rest } = props;
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      const { scrollWidth, clientWidth } = textRef.current;
      setIsTruncated(scrollWidth > clientWidth);
    }
  }, []);

  useLayoutEffect(() => {
    const observer = new MutationObserver(checkTruncation);
    if (textRef.current) observer.observe(textRef.current, { childList: true, subtree: true });

    checkTruncation();
    window.addEventListener('resize', checkTruncation);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkTruncation);
    };
  }, [checkTruncation, children]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {asChild ? (
          <Slot
            ref={textRef}
            className={cn('truncate', { block: isTruncated, 'inline-flex': !isTruncated }, className)}
            {...rest}
          >
            {children}
          </Slot>
        ) : (
          <span
            ref={textRef}
            className={cn('truncate', { block: isTruncated, 'inline-flex': !isTruncated }, className)}
            {...rest}
          >
            {children}
          </span>
        )}
      </TooltipTrigger>
      {isTruncated && <TooltipContent style={{ wordBreak: 'break-all' }}>{children}</TooltipContent>}
    </Tooltip>
  );
}
