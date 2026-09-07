import { useEffect, useRef, useState } from 'react';
import { RiCheckLine, RiFileCopyLine } from 'react-icons/ri';

type CopyableTerminalBlockProps = {
  displayCommand: string;
  copyCommand: string;
  commandClassName?: string;
};

export function CopyableTerminalBlock({
  displayCommand,
  copyCommand,
  commandClassName = 'whitespace-pre-wrap break-all',
}: CopyableTerminalBlockProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const writeToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  };

  const handleCopyButtonClick = () => {
    void writeToClipboard(copyCommand);
  };

  const handleContentCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.clipboardData.setData('text/plain', copyCommand);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-[inset_0px_0px_0px_1px_#18181b,inset_0px_0px_0px_1.5px_rgba(255,255,255,0.1)]">
      <div className="flex items-center justify-between bg-[rgba(14,18,27,0.9)] px-4 py-1.5">
        <span className="text-label-xs text-[#99a0ae]">Terminal</span>
        <button
          type="button"
          onClick={handleCopyButtonClick}
          className="flex size-6 items-center justify-center rounded p-1.5 transition-colors hover:bg-white/10"
        >
          {copied ? (
            <RiCheckLine className="size-3.5 text-[#99a0ae]" />
          ) : (
            <RiFileCopyLine className="size-3.5 text-[#99a0ae]" />
          )}
        </button>
      </div>
      <div className="bg-[rgba(14,18,27,0.9)] px-[5px] pb-[5px]">
        <div
          className="flex gap-4 rounded-md border border-[rgba(14,18,27,0.9)] bg-[rgba(14,18,27,0.9)] p-3"
          onCopy={handleContentCopy}
        >
          <span className="shrink-0 font-mono text-xs text-[#525866]">❯</span>
          <span className={`font-mono text-xs text-white ${commandClassName}`}>{displayCommand}</span>
        </div>
      </div>
    </div>
  );
}
