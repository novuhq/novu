import { Badge } from '@/components/primitives/badge';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import {
  formatLastSeen,
  formatShare,
  isRarelyUsed,
  type Readiness,
  WINDOW_DAYS,
  type WindowDays,
} from './subscriber-tokens-readiness';

const HEAD = 'h-8 whitespace-nowrap px-3 text-xs';
const CELL = 'whitespace-nowrap px-3 py-1.5 text-xs';
const EMPTY = '–';

export function SubscriberTokensLogins({
  environmentName,
  readiness,
  days,
  onDaysChange,
}: {
  environmentName: string;
  readiness: Readiness;
  days: WindowDays;
  onDaysChange: (days: WindowDays) => void;
}) {
  const total = readiness.tokenLogins + readiness.withoutTokenLogins;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-foreground-600 text-xs font-medium">Inbox logins in {environmentName}</span>
        <SegmentedControl value={String(days)} onValueChange={(value) => onDaysChange(Number(value) as WindowDays)}>
          <SegmentedControlList className="w-auto">
            {WINDOW_DAYS.map((option) => (
              <SegmentedControlTrigger key={option} value={String(option)} className="px-2 text-xs">
                {option} days
              </SegmentedControlTrigger>
            ))}
          </SegmentedControlList>
        </SegmentedControl>
      </div>

      {total > 0 ? (
        <>
          <div
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
            title={`${formatShare(readiness.tokenShare)}% signed token`}
          >
            <div className="bg-success-base h-full" style={{ width: `${readiness.tokenShare * 100}%` }} />
            <div className="bg-warning-base h-full" style={{ width: `${(1 - readiness.tokenShare) * 100}%` }} />
          </div>
          <Table containerClassname="shadow-none">
            <TableHeader>
              <TableRow>
                <TableHead className={HEAD}>SDK client</TableHead>
                <TableHead className={`${HEAD} text-right`}>Signed token</TableHead>
                <TableHead className={`${HEAD} text-right`}>Without token</TableHead>
                <TableHead className={HEAD}>Last seen without token</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readiness.clients.map((row) => (
                <TableRow key={row.client}>
                  <TableCell className={`${CELL} font-code`}>
                    <span className="inline-flex items-center gap-2">
                      {row.client}
                      {row.withoutToken > 0 &&
                        (isRarelyUsed(row) ? (
                          <Badge variant="lighter" color="gray" size="sm">
                            rarely used
                          </Badge>
                        ) : (
                          <Badge variant="lighter" color="yellow" size="sm">
                            update
                          </Badge>
                        ))}
                    </span>
                  </TableCell>
                  <TableCell className={`${CELL} text-right tabular-nums`}>{formatCount(row.token)}</TableCell>
                  <TableCell className={`${CELL} text-right tabular-nums`}>{formatCount(row.withoutToken)}</TableCell>
                  <TableCell className={CELL}>
                    {row.lastSeenWithoutTokenDaysAgo === null ? EMPTY : formatLastSeen(row.lastSeenWithoutTokenDaysAgo)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : (
        <p className="text-foreground-500 text-xs">No Inbox logins in the last {days} days.</p>
      )}

      <p className="text-foreground-400 text-xs">
        Counts new Inbox logins. Tabs that are already open keep their session until they reload. Clients not seen
        without a token for a week are usually safe to leave behind.
      </p>
    </div>
  );
}

function formatCount(count: number): string {
  return count ? count.toLocaleString() : EMPTY;
}
