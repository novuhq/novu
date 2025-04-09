/**
 * Variable with optionally additional context
 * depending on where the variable was inserted
 */
export type VariableWithContext = {
  name: string;
  aliasFor?: string | null;
};

export type Filters = {
  label: string;
  value: string;
  hasParam?: boolean;
  description?: string;
  example?: string;
  sampleValue?: string;
  params?: {
    placeholder: string;
    description?: string;
    type?: 'string' | 'number';
    defaultValue?: string;
  }[];
};

export type FilterWithParam = {
  value: string;
  params?: string[];
};

export type VariablePopoverProps = {
  variable?: VariableWithContext;
  onUpdate: (newValue: string) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
};
