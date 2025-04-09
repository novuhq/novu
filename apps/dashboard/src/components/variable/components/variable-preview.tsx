type VariablePreviewProps = {
  children: React.ReactNode;
  className?: string;
};

export function VariablePreview({ children, className = '' }: VariablePreviewProps) {
  return <div className={`flex max-w-56 flex-col justify-center gap-1 p-1 ${className}`}>{children}</div>;
}

type VariablePreviewContentProps = {
  children: React.ReactNode;
  className?: string;
};

function Content({ children, className = '' }: VariablePreviewContentProps) {
  return (
    <div
      className={`border-stroke-soft flex flex-col justify-center gap-2 rounded-sm border bg-white p-1 ${className}`}
    >
      {children}
    </div>
  );
}

function Description({ children, className = '' }: VariablePreviewContentProps) {
  return (
    <div className={`p-0.5 pb-0 ${className}`}>
      <p className="text-text-sub text-xs">{children}</p>
    </div>
  );
}

VariablePreview.Content = Content;
VariablePreview.Description = Description;
