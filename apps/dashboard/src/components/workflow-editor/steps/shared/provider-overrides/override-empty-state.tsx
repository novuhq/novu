import { type ButtonHTMLAttributes, forwardRef, type ReactElement, type ReactNode, useState } from 'react';
import type { IconType } from 'react-icons';
import { RiAddLine, RiFileCopyLine, RiStackLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';

type OverrideActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconType;
};

const OverrideActionButton = forwardRef<HTMLButtonElement, OverrideActionButtonProps>(
  ({ icon: Icon, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'border-stroke-soft bg-bg-white text-label-2xs text-text-strong hover:bg-bg-weak flex items-center gap-1 rounded-[5px] border py-[3px] pl-1.5 pr-2 transition-colors',
        className
      )}
      {...props}
    >
      <Icon className="text-text-sub size-3" />
      {children}
    </button>
  )
);
OverrideActionButton.displayName = 'OverrideActionButton';

/** Free-form providers have no field list to pick from, so the key is typed in place instead. */
function InlineKeyInput({ onSubmit, onCancel }: { onSubmit: (key: string) => void; onCancel: () => void }) {
  const [key, setKey] = useState('');

  return (
    <div className="border-stroke-soft bg-bg-white focus-within:border-stroke-strong flex items-center gap-1 rounded-[5px] border py-[3px] pl-1.5 pr-2">
      <RiAddLine className="text-text-sub size-3 shrink-0" />
      <input
        // biome-ignore lint/a11y/noAutofocus: opened by an explicit "Add key" click
        autoFocus
        aria-label="New key name"
        value={key}
        placeholder="key_name"
        className="text-code-2xs text-text-strong placeholder:text-text-soft w-24 bg-transparent outline-none"
        onChange={(event) => setKey(event.target.value)}
        onBlur={() => {
          if (!key.trim()) {
            onCancel();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && key.trim()) {
            event.preventDefault();
            onSubmit(key.trim());
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      />
    </div>
  );
}

type OverrideEmptyStateProps = {
  message: string;
  canEdit: boolean;
  /** Wraps the "Add key" button in the provider's field picker; without it the key is typed in place. */
  renderFieldPicker?: (trigger: ReactElement) => ReactNode;
  onAddKey: (key: string) => void;
  onCopyInheritedKeys?: () => void;
};

export function OverrideEmptyState({
  message,
  canEdit,
  renderFieldPicker,
  onAddKey,
  onCopyInheritedKeys,
}: OverrideEmptyStateProps) {
  const [isTypingKey, setIsTypingKey] = useState(false);

  const renderAddKey = () => {
    if (renderFieldPicker) {
      return renderFieldPicker(<OverrideActionButton icon={RiAddLine}>Add key</OverrideActionButton>);
    }

    if (isTypingKey) {
      return <InlineKeyInput onSubmit={onAddKey} onCancel={() => setIsTypingKey(false)} />;
    }

    return (
      <OverrideActionButton icon={RiAddLine} onClick={() => setIsTypingKey(true)}>
        Add key
      </OverrideActionButton>
    );
  };

  return (
    <div className="border-stroke-soft bg-bg-white flex flex-col items-center gap-2.5 rounded-md border px-4 py-6">
      <RiStackLine className="text-text-soft size-[18px]" />
      <p className="text-paragraph-xs text-text-sub w-[240px] text-center">{message}</p>
      {canEdit && (
        <div className="flex items-start gap-1.5">
          {renderAddKey()}
          {onCopyInheritedKeys && (
            <OverrideActionButton icon={RiFileCopyLine} onClick={onCopyInheritedKeys}>
              Copy inherited keys
            </OverrideActionButton>
          )}
        </div>
      )}
    </div>
  );
}
