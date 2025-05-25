import { useMemo } from 'react';
import { JsonViewer } from '@textea/json-viewer';
import { cn } from '@/utils/ui';
import { createEditableStringType, createEditableNumberType, createEditableBooleanType } from './editable-data-types';

type EditableJsonViewerProps = {
  value: any;
  onChange: (path: (string | number)[], currentValue: any, newValue: any) => void;
  className?: string;
};

// Custom theme for JsonViewer to match our design system
const jsonViewerTheme = {
  backgroundColor: 'transparent',

  // Color scheme matching our design tokens
  base00: 'hsl(var(--background))', // background
  base01: 'hsl(var(--neutral-100))', // lighter background
  base02: 'hsl(var(--neutral-200))', // selection background
  base03: 'hsl(var(--neutral-400))', // comments, invisibles
  base04: 'hsl(var(--neutral-500))', // dark foreground
  base05: 'hsl(var(--foreground-950))', // default foreground
  base06: 'hsl(var(--foreground-800))', // light foreground
  base07: 'hsl(var(--foreground-600))', // lightest foreground
  base08: 'hsl(var(--destructive))', // variables, XML tags
  base09: 'hsl(var(--information))', // integers, boolean, constants
  base0A: 'hsl(var(--warning))', // classes, markup bold
  base0B: 'hsl(var(--highlighted))', // strings, inherited class
  base0C: 'hsl(var(--information))', // support, regular expressions
  base0D: 'hsl(var(--feature))', // functions, methods
  base0E: 'hsl(var(--feature))', // keywords, storage
  base0F: 'hsl(var(--neutral-600))', // deprecated, opening/closing tags
};

// Shared input styles
const inputClassName =
  'bg-background border border-neutral-300 rounded px-1 py-0.5 text-xs font-mono min-w-[60px] focus:outline-none focus:ring-1 focus:ring-feature';
const inputStyle = {
  fontSize: '12px',
  fontFamily: 'JetBrains Mono, monospace',
};

// Shared span styles
const spanClassName = 'cursor-pointer hover:bg-neutral-100 rounded px-1 py-0.5 transition-colors';
const spanStyle = {
  fontSize: '12px',
  fontFamily: 'JetBrains Mono, monospace',
};

export function EditableJsonViewer({ value, onChange, className }: EditableJsonViewerProps) {
  // Create the editable types with the onChange handler
  const editableTypes = useMemo(
    () => [createEditableStringType(onChange), createEditableNumberType(onChange), createEditableBooleanType(onChange)],
    [onChange]
  );

  return (
    <div
      className={cn(
        'border-neutral-alpha-200 bg-background text-foreground-600',
        'mx-0 mt-0 rounded-lg border border-dashed p-3',
        'max-h-[400px] min-h-[100px] overflow-auto',
        'font-mono text-xs',
        className
      )}
    >
      <JsonViewer
        value={value}
        onChange={onChange}
        displayDataTypes={false}
        defaultInspectDepth={3}
        theme={jsonViewerTheme}
        valueTypes={editableTypes}
        style={{
          fontSize: '12px',
          lineHeight: '1.5',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      />
    </div>
  );
}
