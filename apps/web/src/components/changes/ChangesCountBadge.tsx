import { useQuery } from 'react-query';
import { getChangesCount } from '../../api/changes';
import { QueryKeys } from '../../api/query.keys';
import { NotificationBadge } from '../../design-system';

export const ChangesCountBadge = () => {
  const { data: changesCount = 0 } = useQuery<number>(QueryKeys.changesCount, getChangesCount);

  return changesCount ? (
    <NotificationBadge>
      <div data-test-id="side-nav-changes-count">{changesCount}</div>
    </NotificationBadge>
  ) : null;
};
