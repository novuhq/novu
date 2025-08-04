import { Editor } from '@/components/primitives/editor';
import { BASIC_SETUP, JSON_EXTENSIONS } from './constants';
import { CustomTextEditorProps } from './types';

export function CustomTextEditor({ value, onChange, onKeyDown }: CustomTextEditorProps) {
  return (
    <Editor
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      lang="javascript"
      extensions={JSON_EXTENSIONS}
      basicSetup={BASIC_SETUP}
      multiline
      className="min-h-[200px] overflow-auto rounded border border-neutral-300"
    />
  );
}
