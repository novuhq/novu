import { ConversationActivityTypeEnum } from './conversation-activity.entity';

export type MessageRevisionRow = {
  type: ConversationActivityTypeEnum;
  platformMessageId?: string;
  content?: string;
  richContent?: Record<string, unknown>;
  sequence?: number;
  createdAt?: string | Date;
  _id?: string;
};

function revisionOrderKey(row: MessageRevisionRow): string {
  const sequence = typeof row.sequence === 'number' ? String(row.sequence).padStart(16, '0') : '0000000000000000';
  const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : 0;

  return `${sequence}:${createdAt}:${row._id ?? ''}`;
}

function indexRevisions<T extends MessageRevisionRow>(
  revisions: T[]
): {
  latestEdit: Map<string, T>;
  deletedIds: Set<string>;
} {
  const latestEdit = new Map<string, T>();
  const deletedIds = new Set<string>();

  for (const row of revisions) {
    const platformMessageId = row.platformMessageId;
    if (!platformMessageId) {
      continue;
    }

    if (row.type === ConversationActivityTypeEnum.DELETE) {
      deletedIds.add(platformMessageId);
      continue;
    }

    if (row.type !== ConversationActivityTypeEnum.EDIT) {
      continue;
    }

    const previous = latestEdit.get(platformMessageId);
    if (!previous || revisionOrderKey(row) > revisionOrderKey(previous)) {
      latestEdit.set(platformMessageId, row);
    }
  }

  return { latestEdit, deletedIds };
}

/** Apply latest `edit` / absorbing `delete` onto a page of current-state rows. */
export function foldMessageRevisions<T extends MessageRevisionRow>(page: T[], revisions: T[]): T[] {
  const { latestEdit, deletedIds } = indexRevisions(revisions);

  return page.flatMap((row) => {
    if (row.type !== ConversationActivityTypeEnum.MESSAGE) {
      return [row];
    }

    const platformMessageId = row.platformMessageId;
    if (platformMessageId && deletedIds.has(platformMessageId)) {
      return [];
    }

    const edit = platformMessageId ? latestEdit.get(platformMessageId) : undefined;
    if (!edit) {
      return [row];
    }

    return [
      {
        ...row,
        content: edit.content,
        ...(edit.richContent !== undefined ? { richContent: edit.richContent } : {}),
      },
    ];
  });
}

export function resolveCurrentMessage<T extends MessageRevisionRow>(message: T, revisions: T[]): T | null {
  return foldMessageRevisions([message], revisions)[0] ?? null;
}
