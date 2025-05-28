import { loadLanguage } from '@uiw/codemirror-extensions-langs';

export const JSON_EXTENSIONS = [loadLanguage('javascript')?.extension ?? []];
export const BASIC_SETUP = { lineNumbers: true, defaultKeymap: true };

export const CUSTOM_THEME = {
  container: {
    backgroundColor: 'transparent',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  property: {
    color: 'hsl(var(--foreground-950))',
    fontWeight: '500',
  },
  bracket: {
    color: 'hsl(var(--neutral-600))',
    fontWeight: '600',
  },
  colon: {
    color: 'hsl(var(--neutral-600))',
  },
  comma: {
    color: 'hsl(var(--neutral-600))',
  },
  string: {
    color: 'hsl(var(--highlighted))',
  },
  number: {
    color: 'hsl(var(--information))',
  },
  boolean: {
    color: 'hsl(var(--feature))',
    fontWeight: '600',
  },
  null: {
    color: 'hsl(var(--neutral-400))',
    fontStyle: 'italic',
  },
  undefined: {
    color: 'hsl(var(--neutral-400))',
    fontStyle: 'italic',
  },
  editIcon: {
    color: 'hsl(var(--neutral-400))',
    '&:hover': {
      color: 'hsl(var(--feature))',
    },
  },
  addIcon: {
    color: 'hsl(var(--feature))',
    '&:hover': {
      color: 'hsl(var(--feature))',
      opacity: 0.8,
    },
  },
  deleteIcon: {
    color: 'hsl(var(--destructive))',
    '&:hover': {
      color: 'hsl(var(--destructive))',
      opacity: 0.8,
    },
  },
  collapseIcon: {
    color: 'hsl(var(--neutral-500))',
  },
  iconCollection: {
    backgroundColor: 'transparent',
  },
  input: {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--neutral-300))',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
    color: 'hsl(var(--foreground-950))',
    '&:focus': {
      outline: 'none',
      borderColor: 'hsl(var(--feature))',
      boxShadow: '0 0 0 1px hsl(var(--feature))',
    },
  },
  select: {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--neutral-300))',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
    color: 'hsl(var(--foreground-950))',
    '&:focus': {
      outline: 'none',
      borderColor: 'hsl(var(--feature))',
      boxShadow: '0 0 0 1px hsl(var(--feature))',
    },
  },
  error: {
    color: 'hsl(var(--destructive))',
    fontSize: '11px',
    marginTop: '2px',
  },
};

export const VALUE_TYPE_COLORS = {
  string: 'hsl(var(--highlighted))',
  number: 'hsl(var(--information))',
  boolean: 'hsl(var(--feature))',
  default: 'inherit',
} as const;
