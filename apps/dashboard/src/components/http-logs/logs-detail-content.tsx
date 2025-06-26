import { useState } from 'react';
import { RiArrowUpSLine } from 'react-icons/ri';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDateSimple } from '@/utils/format-date';
import { RequestLog } from '../../types/logs';
import { HttpStatusBadge } from './http-status-badge';
import { EditableJsonViewer } from '../workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { CopyButton } from '../primitives/copy-button';

type LogsDetailContentProps = {
  log: RequestLog;
};

function JsonDisplay({ content }: { content: string | object }) {
  let jsonData;

  try {
    if (typeof content === 'string') {
      if (content.trim() === '' || content.trim() === '{}') {
        jsonData = {};
      } else {
        jsonData = JSON.parse(content);
      }
    } else {
      jsonData = content;
    }
  } catch {
    jsonData = typeof content === 'string' ? content : content;
  }

  return (
    <div className="pointer-events-none">
      <EditableJsonViewer
        value={jsonData}
        onChange={() => {}} // Read-only mode
        className="max-h-none min-h-0 border-none bg-transparent [&_.json-editor]:pointer-events-none"
      />
    </div>
  );
}

function CollapsibleSection({
  title,
  content,
  isExpanded,
  onToggle,
}: {
  title: string;
  content: string | object;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const textToCopy = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  return (
    <div className="border-stroke-soft overflow-auto rounded-lg border bg-white">
      <div
        className="border-stroke-soft flex cursor-pointer items-center justify-between px-2 py-1.5"
        onClick={onToggle}
      >
        <span className="text-text-sub font-mono text-xs font-medium tracking-[-0.24px]">{title}</span>
        <div className="flex items-center gap-0.5">
          <CopyButton valueToCopy={textToCopy} className="text-text-soft size-7 p-1" size="2xs" />
          <button className="rounded p-1 hover:bg-neutral-100">
            <RiArrowUpSLine
              className={`size-3.5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-stroke-soft bg-bg-weak h-[148px] overflow-y-auto border-t">
          <JsonDisplay content={content} />
        </div>
      )}
    </div>
  );
}

export function LogsDetailContent({ log }: LogsDetailContentProps) {
  const [isRequestExpanded, setIsRequestExpanded] = useState(true);
  const [isResponseExpanded, setIsResponseExpanded] = useState(true);

  const hasRequestBody = log.requestBody && log.requestBody !== '{}' && log.requestBody.toString().trim() !== '';
  const hasResponseBody = log.responseBody && log.responseBody !== '{}' && log.responseBody.toString().trim() !== '';

  return (
    <div className="overflow-auto">
      <div className="space-y-2 px-3 py-2.5">
        <div className="mb-3">
          <div className="mb-3 flex items-center gap-2">
            <div>
              <HttpStatusBadge statusCode={log.statusCode} className="text-xs" />
            </div>
            <span className="text-text-soft font-mono text-xs font-normal tracking-[-0.24px]">{log.method}</span>
            <span className="text-text-sub flex-1 truncate font-mono text-xs font-medium tracking-[-0.24px]">
              {log.path}
            </span>
            <span className="text-text-soft font-mono text-[11px] font-normal">{log.transactionId}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-soft font-mono text-xs font-medium tracking-[-0.24px]">Received at</span>
              <span className="text-text-sub font-mono text-xs font-normal tracking-[-0.24px]">
                <TimeDisplayHoverCard date={new Date(log.createdAt)}>
                  {formatDateSimple(log.createdAt, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </TimeDisplayHoverCard>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-soft font-mono text-xs font-medium tracking-[-0.24px]">API</span>
              <span className="text-text-sub font-mono text-xs font-normal tracking-[-0.24px]">{log.path}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-soft font-mono text-xs font-medium tracking-[-0.24px]">Source</span>
              <span className="text-text-sub font-mono text-xs font-normal tracking-[-0.24px]">API</span>
            </div>
          </div>
        </div>

        {hasRequestBody && (
          <CollapsibleSection
            title="Request body"
            content={log.requestBody}
            isExpanded={isRequestExpanded}
            onToggle={() => setIsRequestExpanded(!isRequestExpanded)}
          />
        )}

        {hasResponseBody && (
          <CollapsibleSection
            title="Response body"
            content={log.responseBody}
            isExpanded={isResponseExpanded}
            onToggle={() => setIsResponseExpanded(!isResponseExpanded)}
          />
        )}
      </div>
    </div>
  );
}
