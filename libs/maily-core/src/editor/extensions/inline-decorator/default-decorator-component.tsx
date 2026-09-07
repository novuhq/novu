/** biome-ignore-all lint/a11y/noAutofocus: needs to be fixed */
import React from 'react';
import { InlineDecoratorComponentProps } from './inline-decorator';

export const DefaultInlineDecoratorComponent: React.FC<InlineDecoratorComponentProps> = ({
  decoratorKey,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(decoratorKey);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(decoratorKey);
  };

  const handleSave = () => {
    if (editValue !== decoratorKey && onUpdate) {
      onUpdate(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(decoratorKey);
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Backspace' && editValue === '') {
      handleCancel();
      onDelete?.();
    }
  };

  const monoFontStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  };

  if (isEditing) {
    return (
      <input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        autoFocus
        className="mly-rounded mly-border mly-border-gray-400 mly-px-1 mly-py-0 mly-text-sm"
        style={{ ...monoFontStyle, minWidth: '100px' }}
      />
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleDelete(e);
      }}
      className="mly-group mly-inline-flex mly-cursor-pointer mly-items-center mly-gap-1 mly-rounded-full mly-border mly-border-gray-200 mly-px-1.5 mly-py-0.5 mly-leading-none mly-transition-colors hover:mly-bg-gray-50"
      style={monoFontStyle}
      title="Double-click to edit, right-click to delete"
    >
      <span>{decoratorKey}</span>
      <button
        onClick={handleDelete}
        className="mly-ml-1 mly-hidden mly-h-3 mly-w-3 mly-items-center mly-justify-center mly-rounded-full mly-bg-red-500 mly-text-xs mly-text-white mly-opacity-0 mly-transition-opacity group-hover:mly-flex group-hover:mly-opacity-100"
        title="Delete"
        style={{ fontSize: '8px', lineHeight: '1' }}
      >
        ×
      </button>
    </span>
  );
};
