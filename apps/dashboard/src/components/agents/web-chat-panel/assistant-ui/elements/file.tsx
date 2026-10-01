import type { FileMessagePartComponent } from '@assistant-ui/react';
import { memo } from 'react';
import { RiDownloadLine, RiFileLine } from 'react-icons/ri';

function getFileDataKind(data: string, sourceType?: 'url' | 'id'): 'data-uri' | 'url' | 'base64' | 'id' {
  if (sourceType === 'url' && /^data:/i.test(data)) return 'data-uri';
  if (sourceType) return sourceType;
  if (/^data:/i.test(data)) return 'data-uri';
  if (/^https?:\/\//i.test(data)) return 'url';

  return 'base64';
}

const FileImpl: FileMessagePartComponent = ({ filename, data, mimeType, sourceType }) => {
  const kind = getFileDataKind(data, sourceType);
  const canDownload = kind !== 'id' && (kind !== 'url' || /^(https?:\/\/|blob:)/i.test(data));
  const href = kind === 'base64' ? `data:${mimeType};base64,${data}` : data;

  return (
    <div
      data-slot="file-root"
      className="border-stroke-soft hover:bg-bg-weak inline-flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
    >
      <RiFileLine className="text-text-soft size-5 shrink-0" aria-hidden />
      <span className="text-label-sm text-text-strong min-w-0 flex-1 truncate font-medium">
        {filename || 'Unnamed file'}
      </span>
      {canDownload ? (
        <a
          href={href}
          download={filename || 'download'}
          {...(kind === 'url' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-text-soft hover:text-text-strong shrink-0 rounded-md p-1"
        >
          <RiDownloadLine className="size-4" />
          <span className="sr-only">Download</span>
        </a>
      ) : null}
    </div>
  );
};

export const File = memo(FileImpl);
