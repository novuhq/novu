import { JSONSchema7 } from 'json-schema';

export type EditableJsonViewerProps = {
  value: any;
  onChange: (updatedData: any) => void;
  className?: string;
  schema?: JSONSchema7;
  isReadOnly?: boolean;
};

export type SingleClickEditableValueProps = {
  value: any;
  setValue?: (value: any) => void;
  setIsEditing?: (editing: boolean) => void;
  customNodeProps?: { type?: string };
};

export type CustomTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
};
