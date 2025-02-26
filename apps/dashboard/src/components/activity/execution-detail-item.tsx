import { IExecutionDetail } from '@novu/shared';
import { format } from 'date-fns';
import { formatJSONString } from '../../utils/string';
import { ActivityDetailCard } from './activity-detail-card';

interface ExecutionDetailItemProps {
  detail: IExecutionDetail;
}

export function ExecutionDetailItem(props: ExecutionDetailItemProps) {
  const { detail } = props;

  return (
    <div className="flex items-start gap-3">
      <ActivityDetailCard
        title={detail.detail}
        timestamp={format(new Date(detail.createdAt), 'HH:mm:ss')}
        expandable={!!detail.raw}
      >
        {detail.raw && (
          <pre className="min-w-0 max-w-full font-mono" style={{ width: '1px' }}>
            {formatJSONString(detail.raw)}
          </pre>
        )}
      </ActivityDetailCard>
    </div>
  );
}
