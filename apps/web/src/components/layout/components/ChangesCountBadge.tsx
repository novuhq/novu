import { useQuery } from '@tanstack/react-query';

import { NotificationBadge } from '@novu/design-system';
import { getChangesCount } from '../../../api/changes';
import { QueryKeys } from '../../../api/query.keys';

export const ChangesCountBadge = () => {
  const { data: changesCount = 0 } = useQuery<number>([QueryKeys.changesCount], getChangesCount);

  return changesCount ? (
    <NotificationBadge>
      <div data-test-id="side-nav-changes-count">{changesCount}</div>
    </NotificationBadge>
  ) : null;
};
