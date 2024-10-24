import { useState } from 'react';
import { RiCheckLine, RiFileCopyLine } from 'react-icons/ri';
import { Button, ButtonProps } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '@/utils/ui';

type CopyButtonProps = {
  content: string;
  value?: string;
  className?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
};

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  content,
  className,
  variant = 'outline',
  size = 'icon',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={isHovered}>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn('flex items-center gap-1', className)}
            onClick={copyToClipboard}
            aria-label="Copy to clipboard"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isCopied ? <RiCheckLine className="size-4" /> : <RiFileCopyLine className="size-4" />}
            {value && <span>{value}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isCopied ? 'Copied!' : 'Click to copy'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
