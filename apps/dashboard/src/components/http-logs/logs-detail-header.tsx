type LogsDetailHeaderProps = {
  className?: string;
};

export function LogsDetailHeader({ className }: LogsDetailHeaderProps) {
  return (
    <div className={`bg-bg-weak border-stroke-soft border-b px-2 py-1.5 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-label-sm text-text-strong font-medium">API request</span>
        </div>
      </div>
    </div>
  );
}
