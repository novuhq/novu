import { useCallback, useEffect, useRef, useState } from 'react';
import { defineDataType } from '@textea/json-viewer';

type OnChangeHandler = (path: (string | number)[], currentValue: any, newValue: any) => void;

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

export function createEditableStringType(onChange: OnChangeHandler) {
  return defineDataType({
    is: (value: unknown): value is string => typeof value === 'string',
    Component: (props) => {
      const { value, path } = props;
      const [isEditing, setIsEditing] = useState(false);
      const [editValue, setEditValue] = useState(value as string);
      const inputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        if (isEditing && inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, [isEditing]);

      const handleSave = useCallback(() => {
        if (editValue !== value) {
          onChange(path, value, editValue);
        }

        setIsEditing(false);
      }, [editValue, value, onChange, path]);

      // Handle click outside to save
      useEffect(() => {
        if (!isEditing) return;

        const handleClickOutside = (event: MouseEvent) => {
          if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
            handleSave();
          }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }, [isEditing, handleSave]);

      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setEditValue(value as string);
          setIsEditing(false);
        }
      };

      if (isEditing) {
        return (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={inputClassName}
            style={inputStyle}
          />
        );
      }

      return (
        <span
          onClick={() => setIsEditing(true)}
          className={spanClassName}
          style={{
            ...spanStyle,
            color: 'hsl(var(--highlighted))',
          }}
          title="Click to edit"
        >
          "{value as string}"
        </span>
      );
    },
  });
}

export function createEditableNumberType(onChange: OnChangeHandler) {
  return defineDataType({
    is: (value: unknown): value is number => typeof value === 'number',
    Component: (props) => {
      const { value, path } = props;
      const [isEditing, setIsEditing] = useState(false);
      const [editValue, setEditValue] = useState((value as number).toString());
      const inputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        if (isEditing && inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, [isEditing]);

      const handleSave = useCallback(() => {
        const numValue = parseFloat(editValue);

        if (!isNaN(numValue) && numValue !== value) {
          onChange(path, value, numValue);
        }

        setIsEditing(false);
      }, [editValue, value, onChange, path]);

      // Handle click outside to save
      useEffect(() => {
        if (!isEditing) return;

        const handleClickOutside = (event: MouseEvent) => {
          if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
            handleSave();
          }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }, [isEditing, handleSave]);

      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setEditValue((value as number).toString());
          setIsEditing(false);
        }
      };

      if (isEditing) {
        return (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={inputClassName}
            style={inputStyle}
          />
        );
      }

      return (
        <span
          onClick={() => setIsEditing(true)}
          className={spanClassName}
          style={{
            ...spanStyle,
            color: 'hsl(var(--information))',
          }}
          title="Click to edit"
        >
          {value as number}
        </span>
      );
    },
  });
}

export function createEditableBooleanType(onChange: OnChangeHandler) {
  return defineDataType({
    is: (value: unknown): value is boolean => typeof value === 'boolean',
    Component: (props) => {
      const { value, path } = props;

      const handleClick = () => {
        const newValue = !(value as boolean);
        onChange(path, value, newValue);
      };

      return (
        <span
          onClick={handleClick}
          className={spanClassName}
          style={{
            ...spanStyle,
            color: 'hsl(var(--feature))',
          }}
          title="Click to toggle"
        >
          {(value as boolean).toString()}
        </span>
      );
    },
  });
}
