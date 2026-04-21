import type { ReactNode } from 'react';

/**
 * Visual chrome shared by all popover editors (link, image, action, field).
 * A small muted label sits above the control, matching the floating
 * popover patterns used elsewhere in the dashboard.
 */
export function PopoverField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs font-medium uppercase tracking-wide text-text-soft">{label}</span>
      {children}
    </label>
  );
}

/**
 * Tailwind overrides that make `ControlInput` (a CodeMirror-backed
 * component) look like a regular text input inside popovers: normal
 * sans font, subtle border, compact padding. Variable pills still
 * render as before.
 */
export const POPOVER_CONTROL_INPUT_CLASS =
  'min-h-8 rounded-md border border-neutral-100 bg-white px-2 py-1.5 text-sm shadow-xs transition-colors focus-within:border-primary-base focus-within:ring-1 focus-within:ring-primary-100 hover:border-neutral-200 [&_.cm-editor]:bg-transparent! [&_.cm-content]:font-sans! [&_.cm-content]:px-0! [&_.cm-content]:py-0! [&_.cm-line]:px-0! [&_.cm-line]:py-0!';
