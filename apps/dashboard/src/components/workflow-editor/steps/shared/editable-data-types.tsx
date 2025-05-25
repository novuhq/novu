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

// Dropdown styles for enum selector
const dropdownClassName =
  'bg-background border border-neutral-300 rounded px-1 py-0.5 text-xs font-mono min-w-[80px] focus:outline-none focus:ring-1 focus:ring-feature';

export function createEditableEnumType(onChange: OnChangeHandler, enumValues: Record<string, any[]>) {
  return defineDataType({
    is: (value: unknown, path: (string | number)[]): value is any => {
      // Check if this path has enum values defined
      const pathKey = path.join('.');
      const enumValuesForPath = enumValues[pathKey];

      if (!enumValuesForPath || !Array.isArray(enumValuesForPath)) {
        return false;
      }

      const hasEnumValues = enumValuesForPath.includes(value);

      return hasEnumValues;
    },
    Component: (props) => {
      const { value, path } = props;
      const [isEditing, setIsEditing] = useState(false);
      const [editValue, setEditValue] = useState(value);
      const selectRef = useRef<HTMLSelectElement>(null);

      const pathKey = path.join('.');
      const availableValues = enumValues[pathKey] || [];

      useEffect(() => {
        if (isEditing && selectRef.current) {
          selectRef.current.focus();
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
          if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
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
          setEditValue(value);
          setIsEditing(false);
        }
      };

      const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        // Try to parse as number or boolean if needed
        let parsedValue: any = newValue;
        if (newValue === 'true') parsedValue = true;
        else if (newValue === 'false') parsedValue = false;
        else if (!isNaN(Number(newValue)) && newValue !== '') parsedValue = Number(newValue);

        setEditValue(parsedValue);
        onChange(path, value, parsedValue);
        setIsEditing(false);
      };

      if (isEditing) {
        return (
          <select
            ref={selectRef}
            value={String(editValue)}
            onChange={handleSelectChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={dropdownClassName}
            style={inputStyle}
          >
            {availableValues.map((enumValue, index) => (
              <option key={index} value={String(enumValue)}>
                {String(enumValue)}
              </option>
            ))}
          </select>
        );
      }

      const displayValue = typeof value === 'string' ? `"${value}"` : String(value);
      const valueColor =
        typeof value === 'string'
          ? 'hsl(var(--highlighted))'
          : typeof value === 'number'
            ? 'hsl(var(--information))'
            : 'hsl(var(--feature))';

      return (
        <span
          onClick={() => setIsEditing(true)}
          className={spanClassName}
          style={{
            ...spanStyle,
            color: valueColor,
          }}
          title={`Click to select from: ${availableValues.join(', ')}`}
        >
          {displayValue}
        </span>
      );
    },
  });
}

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
