import { HttpLog } from '../../types/logs';

type LogsDetailContentProps = {
  log: HttpLog;
};

export function LogsDetailContent({ log }: LogsDetailContentProps) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="space-y-6">
        {/* Request Details */}
        <div>
          <h3 className="text-foreground-900 mb-3 text-sm font-medium">Request Details</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-foreground-600 mb-1 block">Method</span>
                <span className="text-foreground-900 font-code">{log.method}</span>
              </div>
              <div>
                <span className="text-foreground-600 mb-1 block">Status Code</span>
                <span className="text-foreground-900 font-code">{log.statusCode}</span>
              </div>
              <div>
                <span className="text-foreground-600 mb-1 block">Duration</span>
                <span className="text-foreground-900 font-code">{log.durationMs}ms</span>
              </div>
            </div>

            <div>
              <span className="text-foreground-600 mb-1 block text-xs">Path</span>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2">
                <code className="text-foreground-900 font-code break-all text-xs">{log.path}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Query Parameters */}
        {log.queryParams && (
          <div>
            <h3 className="text-foreground-900 mb-3 text-sm font-medium">Query Parameters</h3>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <pre className="font-code text-foreground-900 whitespace-pre-wrap text-xs">{log.queryParams}</pre>
            </div>
          </div>
        )}

        {/* Request Body */}
        {log.requestBody && (
          <div>
            <h3 className="text-foreground-900 mb-3 text-sm font-medium">Request Body</h3>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <pre className="font-code text-foreground-900 whitespace-pre-wrap text-xs">
                {typeof log.requestBody === 'string' ? log.requestBody : JSON.stringify(log.requestBody, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Response Body */}
        {log.responseBody && (
          <div>
            <h3 className="text-foreground-900 mb-3 text-sm font-medium">Response Body</h3>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <pre className="font-code text-foreground-900 whitespace-pre-wrap text-xs">{log.responseBody}</pre>
            </div>
          </div>
        )}

        {/* Additional Details */}
        <div>
          <h3 className="text-foreground-900 mb-3 text-sm font-medium">Additional Details</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-foreground-600 mb-1 block">IP Address</span>
                <span className="text-foreground-900 font-code">{log.ip}</span>
              </div>
              <div>
                <span className="text-foreground-600 mb-1 block">User ID</span>
                <span className="text-foreground-900 font-code">{log.userId || 'N/A'}</span>
              </div>
            </div>

            {log.userAgent && (
              <div>
                <span className="text-foreground-600 mb-1 block text-xs">User Agent</span>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2">
                  <code className="text-foreground-900 font-code break-all text-xs">{log.userAgent}</code>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction ID */}
        {log.transactionId && (
          <div>
            <h3 className="text-foreground-900 mb-3 text-sm font-medium">Transaction ID</h3>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2">
              <code className="text-foreground-900 font-code text-xs">{log.transactionId}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
