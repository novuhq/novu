import { Check } from 'lucide-react';
import { useState } from 'react';
import { RiFileCopyLine } from 'react-icons/ri';
import { cn } from '../../utils/ui';

interface CopyToClipboardProps {
  content: string;
  theme?: 'dark' | 'light';
  className?: string;
  title?: string;
  onCopy?: () => void;
}

export function CopyToClipboard({
  content,
  theme = 'dark',
  className,
  title = 'Copy to clipboard',
  onCopy,
}: CopyToClipboardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setIsCopied(true);
    onCopy?.();
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button
      onClick={copyToClipboard}
      type="button"
      className={cn(
        'rounded-md p-2 transition-all duration-200 active:scale-95',
        theme === 'light'
          ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          : 'text-foreground-400 hover:text-foreground-50 hover:bg-[#32424a]',
        className
      )}
      title={title}
    >
      {isCopied ? <Check className="h-4 w-4" /> : <RiFileCopyLine className="h-4 w-4" />}
    </button>
  );
}
