import { ExecutionDetailsStatusEnum, IExecutionDetail } from '@novu/shared';
import { format } from 'date-fns';
import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { formatJSONString } from '../../utils/string';
import { ActivityDetailCard } from './activity-detail-card';

interface ExecutionDetailItemProps {
  detail: IExecutionDetail;
}

/** Renders backtick-delimited segments of a message in monospace, e.g. an integration identifier. */
function renderWithCodeSegments(message: string) {
  return message.split('`').map((segment, index) =>
    index % 2 === 0 ? (
      <Fragment key={index}>{segment}</Fragment>
    ) : (
      <span className="text-code-xs" key={index}>
        {segment}
      </span>
    )
  );
}

export function ExecutionDetailItem(props: ExecutionDetailItemProps) {
  const { detail } = props;

  const footer = useMemo(() => {
    if (detail.eventType === 'topic_subscription_preference_evaluation') {
      return 'Preferences are evaluated in order. Only the first matching preference is shown.';
    }
    return null;
  }, [detail.eventType]);

  const warning = useMemo(() => {
    if (detail.status !== ExecutionDetailsStatusEnum.WARNING || !detail.message) {
      return null;
    }

    return (
      <>
        {renderWithCodeSegments(detail.message)}
        <Link className="hover:underline" onClick={(event) => event.stopPropagation()} to={ROUTES.INTEGRATIONS}>
          Manage Integrations &rarr;
        </Link>
      </>
    );
  }, [detail.message, detail.status]);

  return (
    <div className="flex items-start gap-3">
      <ActivityDetailCard
        title={detail.detail}
        timestamp={format(new Date(detail.createdAt), 'HH:mm:ss')}
        expandable={!!detail.raw || !!warning}
        footer={footer}
        warning={warning}
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
