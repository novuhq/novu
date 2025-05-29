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
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      color: 'hsl(var(--feature))',
      backgroundColor: 'hsl(var(--neutral-alpha-100))',
      borderRadius: '4px',
      padding: '0 2px',
    },
  },
  bracket: {
    color: 'hsl(var(--neutral-600))',
    fontWeight: '600',
    transition: 'color 0.2s ease-in-out',
    '&:hover': {
      color: 'hsl(var(--feature))',
    },
  },
  colon: {
    color: 'hsl(var(--neutral-600))',
    transition: 'color 0.2s ease-in-out',
  },
  comma: {
    color: 'hsl(var(--neutral-600))',
    transition: 'color 0.2s ease-in-out',
  },
  string: {
    color: 'hsl(var(--highlighted))',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: 'hsl(var(--highlighted) / 0.1)',
      borderRadius: '4px',
      padding: '0 2px',
    },
  },
  number: {
    color: 'hsl(var(--information))',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: 'hsl(var(--information) / 0.1)',
      borderRadius: '4px',
      padding: '0 2px',
    },
  },
  boolean: {
    color: 'hsl(var(--feature))',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: 'hsl(var(--feature) / 0.1)',
      borderRadius: '4px',
      padding: '0 2px',
      transform: 'scale(1.05)',
    },
  },
  null: {
    color: 'hsl(var(--neutral-400))',
    fontStyle: 'italic',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      color: 'hsl(var(--neutral-600))',
      backgroundColor: 'hsl(var(--neutral-alpha-100))',
      borderRadius: '4px',
      padding: '0 2px',
    },
  },
  undefined: {
    color: 'hsl(var(--neutral-400))',
    fontStyle: 'italic',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      color: 'hsl(var(--neutral-600))',
      backgroundColor: 'hsl(var(--neutral-alpha-100))',
      borderRadius: '4px',
      padding: '0 2px',
    },
  },
  editIcon: {
    color: 'hsl(var(--neutral-400))',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    transform: 'scale(1)',
    '&:hover': {
      color: 'hsl(var(--feature))',
      transform: 'scale(1.2)',
      backgroundColor: 'hsl(var(--feature) / 0.1)',
      borderRadius: '4px',
      padding: '2px',
    },
  },
  addIcon: {
    color: 'hsl(var(--feature))',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    transform: 'scale(1)',
    '&:hover': {
      color: 'hsl(var(--feature))',
      transform: 'scale(1.2)',
      backgroundColor: 'hsl(var(--feature) / 0.15)',
      borderRadius: '4px',
      padding: '2px',
      boxShadow: '0 2px 8px hsl(var(--feature) / 0.2)',
    },
  },
  deleteIcon: {
    color: 'hsl(var(--destructive))',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    transform: 'scale(1)',
    '&:hover': {
      color: 'hsl(var(--destructive))',
      transform: 'scale(1.2)',
      backgroundColor: 'hsl(var(--destructive) / 0.1)',
      borderRadius: '4px',
      padding: '2px',
      boxShadow: '0 2px 8px hsl(var(--destructive) / 0.2)',
    },
  },
  collapseIcon: {
    color: 'hsl(var(--neutral-500))',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    transform: 'rotate(0deg)',
    '&:hover': {
      color: 'hsl(var(--feature))',
      transform: 'rotate(90deg) scale(1.1)',
      backgroundColor: 'hsl(var(--feature) / 0.1)',
      borderRadius: '4px',
      padding: '2px',
    },
  },
  iconCollection: {
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: 'hsl(var(--neutral-alpha-50))',
      borderRadius: '6px',
      padding: '2px',
    },
  },
  input: {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--neutral-300))',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
    color: 'hsl(var(--foreground-950))',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      borderColor: 'hsl(var(--neutral-400))',
      boxShadow: '0 0 0 1px hsl(var(--neutral-400) / 0.2)',
    },
    '&:focus': {
      outline: 'none',
      borderColor: 'hsl(var(--feature))',
      boxShadow: '0 0 0 2px hsl(var(--feature) / 0.2)',
      transform: 'scale(1.02)',
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
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      borderColor: 'hsl(var(--neutral-400))',
      boxShadow: '0 0 0 1px hsl(var(--neutral-400) / 0.2)',
      transform: 'scale(1.02)',
    },
    '&:focus': {
      outline: 'none',
      borderColor: 'hsl(var(--feature))',
      boxShadow: '0 0 0 2px hsl(var(--feature) / 0.2)',
      transform: 'scale(1.02)',
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
