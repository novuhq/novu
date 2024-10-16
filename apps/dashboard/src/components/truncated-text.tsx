import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TruncatedTextProps {
  text: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

export default function TruncatedText({ text, className = '', onClick }: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      const { scrollWidth, clientWidth } = textRef.current;
      setIsTruncated(scrollWidth > clientWidth);
    }
  }, []);

  useEffect(() => {
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [checkTruncation]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span ref={textRef} className={cn('block truncate', className)} onClick={onClick}>
            {text}
          </span>
        </TooltipTrigger>
        {isTruncated && (
          <TooltipContent>
            <p>{text}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
