import { type ReactNode, type RefObject, useId, useState } from 'react';
import { RiInformationFill, RiLinkM, RiUploadCloud2Line } from 'react-icons/ri';
import { FormMessage } from '@/components/primitives/form/form';
import { cn } from '@/utils/ui';

export const FILE_READ_ERROR = 'Couldn’t read this file. Choose it again.';

/** The file's text, or undefined when the browser couldn't read it. */
export async function readFileText(file: File): Promise<string | undefined> {
  try {
    return await file.text();
  } catch {
    return undefined;
  }
}

/**
 * A required credential uploaded as a file: drop it on the dashed zone or click to choose it. The caller reads and
 * checks the file in `onFile`, and opens the picker again through `inputRef` (e.g. for "Choose another file").
 */
export function FileDropZone({
  inputRef,
  label,
  accept,
  fileLabel,
  emptyText,
  detectedText,
  error,
  disabled,
  onFile,
  onBlur,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  accept: string;
  /** Shown in the zone once a file is in; undefined shows `emptyText` instead. */
  fileLabel?: string;
  emptyText: string;
  /** Confirms what was read, under the zone, while there's no error. */
  detectedText?: ReactNode;
  error?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  onBlur?: () => void;
}) {
  const labelId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (file && !disabled) onFile(file);
  };

  return (
    <>
      <span id={labelId} className="text-label-xs text-text-sub">
        {label} <span className="text-primary-base">*</span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-labelledby={labelId}
        disabled={disabled}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          // Choosing the same file again should read it again.
          event.target.value = '';
        }}
      />
      <button
        type="button"
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onBlur={onBlur}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          'bg-bg-weak border-stroke-soft flex w-full items-center gap-2 rounded-md border border-dashed p-2 text-left shadow-xs transition-colors disabled:cursor-not-allowed',
          isDragging && 'border-stroke-strong bg-bg-white',
          error && 'border-error-base'
        )}
      >
        {fileLabel !== undefined ? (
          <>
            <RiLinkM className="text-text-sub size-5 shrink-0" />
            <span className="text-text-strong font-code min-w-0 flex-1 truncate text-[12px] font-medium leading-4">
              {fileLabel}
            </span>
          </>
        ) : (
          <>
            <RiUploadCloud2Line className="text-text-soft size-5 shrink-0" />
            <span className="text-label-xs text-text-soft min-w-0 flex-1">{emptyText}</span>
          </>
        )}
      </button>
      {detectedText && !error && (
        <p className="text-paragraph-xs text-text-sub flex items-center gap-1" aria-live="polite">
          <RiInformationFill className="text-text-soft size-4 shrink-0" />
          {detectedText}
        </p>
      )}
      {error && <FormMessage>{error}</FormMessage>}
    </>
  );
}
