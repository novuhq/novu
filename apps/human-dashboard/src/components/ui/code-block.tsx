import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

type CodeBlockProps = {
  code: string;
  /** What is being copied, for screen readers: "Copy MCP config". */
  label: string;
  className?: string;
};

/** A multi-line snippet, such as a config file to paste, with a copy button in the corner. */
export function CodeBlock({ code, label, className }: CodeBlockProps) {
  return (
    <div className={cn('relative rounded bg-background ring-1 ring-border', className)}>
      <pre className="overflow-x-auto p-3 pr-10 font-mono text-[13px] leading-relaxed tracking-tight text-foreground">
        <code>{code}</code>
      </pre>
      <CopyButton value={code} label={label} className="absolute top-1 right-1" />
    </div>
  );
}
