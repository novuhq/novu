import { useState } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDateSimple } from '@/utils/format-date';
import { RequestLog } from '../../types/logs';
import { CopyButton } from '../primitives/copy-button';
import { Separator } from '../primitives/separator';
import { EditableJsonViewer } from '../workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { HttpStatusBadge } from './http-status-badge';
import { TransactionIdDisplay } from './transaction-id-display';

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
    <EditableJsonViewer
      value={jsonData}
      onChange={() => {}} // Read-only mode
      className="max-h-none min-h-0 border-none bg-transparent"
      isReadOnly={true}
    />
  );
}

export function CollapsibleSection({
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
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const textToCopy = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  // Check if content is overflowing when expanded
  const checkOverflow = (element: HTMLDivElement | null) => {
    if (element) {
      setIsOverflowing(element.scrollHeight > 90);
    }
  };

  const handleContentRef = (element: HTMLDivElement | null) => {
    setContentRef(element);

    if (element) {
      // Use setTimeout to ensure content is rendered
      setTimeout(() => checkOverflow(element), 0);
    }
  };

  return (
    <div className="border-stroke-soft overflow-auto rounded-md border bg-white">
      <div
        className="border-stroke-soft py-0.25 flex h-[30px] cursor-pointer items-center justify-between px-2"
        onClick={onToggle}
      >
        <span className="text-text-sub font-mono text-xs font-medium tracking-[-0.24px]">{title}</span>
        <div className="flex items-center gap-0.5">
          <CopyButton valueToCopy={textToCopy} className="text-text-soft size-7 p-1" size="2xs" />
          <button className="rounded p-1 hover:bg-neutral-100">
            <RiArrowUpSLine
              className={`size-3.5 text-neutral-400 transition-transform ${!isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="relative">
          <div
            ref={handleContentRef}
            className={`border-stroke-soft bg-bg-weak [&_.jer-editor-container]:px-4.5 overflow-y-auto border-t transition-all duration-300 [&_.jer-editor-container]:py-1 ${
              isContentExpanded ? 'max-h-none' : 'h-[90px]'
            }`}
          >
            <JsonDisplay content={content} />
          </div>

          {isOverflowing && !isContentExpanded && (
            <div className="absolute bottom-0 left-0 right-0">
              <div className="from-bg-weak via-bg-weak/70 flex items-center justify-center bg-gradient-to-t to-transparent pb-2 pt-8">
                <button
                  onClick={() => setIsContentExpanded(true)}
                  className="group flex items-center gap-1 rounded px-2 text-[11px] font-medium text-neutral-600 transition-all duration-200 hover:bg-white/20 hover:text-neutral-600"
                >
                  <span>Show More</span>
                  <RiArrowDownSLine className="size-3 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {isContentExpanded && (
            <div className="to-bg-weak border-stroke-soft flex items-center justify-center border-t bg-gradient-to-b from-transparent">
              <button
                onClick={() => setIsContentExpanded(false)}
                className="group flex items-center gap-1 rounded px-2 text-[11px] font-medium text-neutral-600 transition-all duration-200 hover:bg-white/20 hover:text-neutral-600"
              >
                <span>Show Less</span>
                <RiArrowUpSLine className="size-3 transition-transform" />
              </button>
            </div>
          )}
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
            <HttpStatusBadge statusCode={log.statusCode} className="text-xs" />
            <span className="text-text-soft font-mono text-xs font-normal tracking-[-0.24px]">{log.method}</span>
            <span className="text-text-sub flex-1 truncate font-mono text-xs font-medium tracking-[-0.24px]">
              {log.path}
            </span>
            <span className="text-text-soft font-mono text-[11px] font-normal">{log.id}</span>
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
              <span className="text-text-soft font-mono text-xs font-medium tracking-[-0.24px]">Transaction ID</span>
              <TransactionIdDisplay transactionId={log.transactionId} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-soft font-mono text-xs font-medium tracking-[-0.24px]">Source</span>
              <span className="text-text-sub font-mono text-xs font-normal tracking-[-0.24px]">
                {log.authType === 'Bearer' ? 'Dashboard' : 'API'}
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-2" />

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
