import * as React from 'react';

import { cn } from '../utils/classname';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'mly-flex mly-min-h-24 mly-w-full mly-rounded-md mly-border mly-border-gray-200 mly-bg-white mly-px-3 mly-py-2 mly-text-sm mly-ring-offset-white file:mly-border-0 file:mly-bg-transparent file:mly-text-sm file:mly-font-medium placeholder:mly-text-gray-500 focus-visible:mly-outline-none focus-visible:mly-ring-2 focus-visible:mly-ring-gray-400 focus-visible:mly-ring-offset-2 disabled:mly-cursor-not-allowed disabled:mly-opacity-50',
        'mly-editor',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
