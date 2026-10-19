import { cn } from '@/utils/ui';

type VariablePreviewProps = {
  children: React.ReactNode;
  className?: string;
};

export function VariablePreview({ children, className = '' }: VariablePreviewProps) {
  return <div className={cn(`flex max-w-56 flex-col justify-center gap-1 p-1`, className)}>{children}</div>;
}

type VariablePreviewContentProps = {
  children: React.ReactNode;
  className?: string;
};

function Content({ children, className = '' }: VariablePreviewContentProps) {
  return (
    <div
      className={cn(
        `border-stroke-soft flex flex-col justify-center gap-2 rounded-sm border bg-white p-1.5`,
        className
      )}
    >
      {children}
    </div>
  );
}

function Description({ children, className = '' }: VariablePreviewContentProps) {
  return <div className={cn(`p-1 py-0`, className)}>{children}</div>;
}

VariablePreview.Content = Content;
VariablePreview.Description = Description;
