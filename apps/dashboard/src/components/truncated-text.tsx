import { Slot, SlotProps } from '@radix-ui/react-slot';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

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
    if (!textRef.current) return;

    const element = textRef.current;
    const mutationObserver = new MutationObserver(checkTruncation);
    const resizeObserver = new ResizeObserver(checkTruncation);

    mutationObserver.observe(element, { childList: true, subtree: true });
    resizeObserver.observe(element);

    checkTruncation();

    window.addEventListener('resize', checkTruncation);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkTruncation);
    };
  }, [checkTruncation]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {asChild ? (
          <Slot ref={textRef} className={cn('truncate inline-block align-bottom', className)} {...rest}>
            {children}
          </Slot>
        ) : (
          <span ref={textRef} className={cn('truncate inline-block align-bottom', className)} {...rest}>
            {children}
          </span>
        )}
      </TooltipTrigger>
      {isTruncated && <TooltipContent style={{ wordBreak: 'break-all' }}>{children}</TooltipContent>}
    </Tooltip>
  );
}
