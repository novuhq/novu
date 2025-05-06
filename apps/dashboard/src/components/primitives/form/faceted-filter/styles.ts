export const STYLES = {
  size: {
    default: {
      trigger: 'h-8',
      input: 'h-8',
      content: 'p-2',
      item: 'py-1.5 px-2',
      badge: 'px-2 py-0.5 text-xs',
      separator: 'h-4',
    },
    small: {
      trigger: 'h-7 px-1 py-1 pl-1.5',
      input: 'h-6 text-xs',
      content: 'p-1.5',
      item: 'py-1 px-1.5',
      badge: 'px-2 py-0 text-xs',
      separator: 'h-3.5 mx-1',
    },
  },
  input: {
    base: 'border-neutral-200 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-0 focus:ring-offset-0',
    text: 'text-neutral-600',
  },
  clearButton: 'justify-center px-0 text-xs text-foreground-500 hover:bg-neutral-50 hover:text-foreground-800',
} as const;
