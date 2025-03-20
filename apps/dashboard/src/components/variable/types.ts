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
  variable?: string;
  onUpdate: (newValue: string) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
};
