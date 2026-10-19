import { IExecutionDetail } from '@novu/shared';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { formatJSONString } from '../../utils/string';
import { ActivityDetailCard } from './activity-detail-card';

interface ExecutionDetailItemProps {
  detail: IExecutionDetail;
}

export function ExecutionDetailItem(props: ExecutionDetailItemProps) {
  const { detail } = props;

  const footer = useMemo(() => {
    if (detail.eventType === 'topic_subscription_preference_evaluation') {
      return 'Preferences are evaluated in order. Only the first matching preference is shown.';
    }
    return null;
  }, [detail.eventType]);

  return (
    <div className="flex items-start gap-3">
      <ActivityDetailCard
        title={detail.detail}
        timestamp={format(new Date(detail.createdAt), 'HH:mm:ss')}
        expandable={!!detail.raw}
        footer={footer}
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
