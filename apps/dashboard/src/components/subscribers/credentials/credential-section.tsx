import { useEffect, useMemo, useState } from 'react';
import { AddIntegrationPicker } from './add-integration-picker';
import type {
  AddableCredentialRow,
  ChannelGroup,
  CredentialRow as CredentialRowModel,
} from './build-credential-groups';
import { type CredentialActions, CredentialRow } from './credential-row';

type CredentialSectionProps = {
  group: ChannelGroup;
  subscriberId: string;
  readOnly: boolean;
  actions: CredentialActions;
};

export function CredentialSection({ group, subscriberId, readOnly, actions }: CredentialSectionProps) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());

  const configuredIds = useMemo(() => new Set(group.rows.map((row) => row.id)), [group.rows]);

  // Drop ids that gained credentials so delete→empty does not ghost-reveal them later.
  useEffect(() => {
    setRevealedIds((prev) => {
      let changed = false;
      const next = new Set(prev);

      for (const id of prev) {
        if (configuredIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [configuredIds]);

  const revealedRows = useMemo(
    () => group.emptyRows.filter((row) => revealedIds.has(row.id)),
    [group.emptyRows, revealedIds]
  );

  const visibleRows: CredentialRowModel[] = useMemo(() => [...group.rows, ...revealedRows], [group.rows, revealedRows]);

  const pickerRows = useMemo(
    () => group.emptyRows.filter((row) => !revealedIds.has(row.id)),
    [group.emptyRows, revealedIds]
  );

  const revealRow = (row: AddableCredentialRow) => {
    setRevealedIds((prev) => {
      if (prev.has(row.id)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(row.id);

      return next;
    });
  };

  const unrevealRow = (rowId: string) => {
    setRevealedIds((prev) => {
      if (!prev.has(rowId)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(rowId);

      return next;
    });
  };

  const showPicker = !readOnly && pickerRows.length > 0;
  const showEmptyHint = visibleRows.length === 0;

  // Read-only has no picker, so empty-only groups would otherwise render a
  // "No credentials set" stub — hide the section entirely instead.
  if (readOnly && visibleRows.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-1 p-2.5">
      <div className="flex h-6 items-center justify-between -mx-2.5 px-2.5 py-1 bg-bg-weak">
        <span className="text-subheading-2xs uppercase text-text-soft">{group.label}</span>
        {showPicker ? <AddIntegrationPicker rows={pickerRows} channelLabel={group.label} onSelect={revealRow} /> : null}
      </div>
      {showEmptyHint ? (
        <span className="text-label-xs py-2.5 text-text-soft">No credentials set</span>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleRows.map((row) => {
            const isRevealedEmpty = revealedIds.has(row.id);

            return (
              <CredentialRow
                key={row.id}
                row={row}
                subscriberId={subscriberId}
                readOnly={readOnly}
                actions={actions}
                autoStartAdding={isRevealedEmpty}
                onAddCancelled={isRevealedEmpty ? () => unrevealRow(row.id) : undefined}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
