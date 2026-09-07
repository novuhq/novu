import { cva, VariantProps } from 'class-variance-authority';
import { HTMLAttributes } from 'react';
import { cn } from '@/utils/ui';

type SidebarHeaderProps = HTMLAttributes<HTMLDivElement>;

export const SidebarHeader = (props: SidebarHeaderProps) => {
  const { className, ...rest } = props;
  return <div className={cn('flex gap-2.5 px-2 py-3.5', className)} {...rest} />;
};

const sidebarContentVariants = cva(`flex flex-col`, {
  variants: {
    size: {
      sm: 'gap-2 px-3 py-2',
      md: 'gap-2.5 px-3 py-3',
      lg: 'gap-2.5 px-3 py-4',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});
type SidebarContentProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof sidebarContentVariants>;

export const SidebarContent = (props: SidebarContentProps) => {
  const { className, size, ...rest } = props;
  return <div className={cn(sidebarContentVariants({ size }), className)} {...rest} />;
};

type SidebarFooterProps = HTMLAttributes<HTMLDivElement>;

export const SidebarFooter = (props: SidebarFooterProps) => {
  const { className, ...rest } = props;
  return <div className={cn('border-t-border-weak mt-auto space-y-2.5 border-t p-2', className)} {...rest} />;
};
