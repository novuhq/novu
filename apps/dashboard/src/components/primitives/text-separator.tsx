import { Separator } from '@/components/primitives/separator';
import { cn } from '@/utils/ui';
import * as React from 'react';

interface TextSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
}

export default function TextSeparator({ text, className, ...props }: TextSeparatorProps) {
  return (
    <div className={cn('relative', className)} {...props}>
      <div className="absolute inset-0 flex items-center">
        <Separator className="w-full" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background text-foreground-400 px-2">{text}</span>
      </div>
    </div>
  );
}
