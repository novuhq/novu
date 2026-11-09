import { describe, expect, it } from 'vitest';
import type { IDiffSummary, IResourceDiffResult } from '@/api/environments';
import { buildChangesTree } from '@/hooks/use-changes-tree';
import { buildChangeCardModel } from './change-sections';

const REQUIRED_AMOUNT_SCHEMA = {
  type: 'object',
  properties: { amount: { type: 'number' } },
  required: ['amount'],
};

function workflowResource(
  summary: IDiffSummary,
  diffs: { previous: Record<string, unknown> | null; new: Record<string, unknown> }
): IResourceDiffResult {
  const isNew = summary.added > 0;

  return {
    resourceType: 'workflow',
    summary,
    sourceResource: { id: 'wf-1', name: 'Welcome' },
    targetResource: isNew ? null : { id: 'wf-1', name: 'Welcome' },
    changes: [
      {
        resourceType: 'workflow',
        action: isNew ? 'added' : 'modified',
        diffs,
      },
    ],
  } as unknown as IResourceDiffResult;
}

function payloadSection(resource: IResourceDiffResult) {
  const [row] = buildChangesTree([resource], [], []).workflows.rows;

  return buildChangeCardModel(row).sections.find((section) => section.key === 'payloadSchema');
}

describe('payload schema breaking changes', () => {
  it('does not mark a new workflow payload as breaking', () => {
    const section = payloadSection(
      workflowResource(
        { added: 1, modified: 0, deleted: 0, unchanged: 0 },
        { previous: null, new: { payloadSchema: REQUIRED_AMOUNT_SCHEMA, validatePayload: true } }
      )
    );

    expect(section?.status).toBe('added');
    expect(section?.schemaChanges?.some((change) => change.severity === 'breaking')).toBe(false);
    expect(section?.items?.every((item) => item.status === 'added')).toBe(true);
    expect(section?.schemaPreview?.note).toBeUndefined();
  });

  it('keeps a validation-only edit modified when the workflow has no schema', () => {
    const section = payloadSection(
      workflowResource(
        { added: 0, modified: 1, deleted: 0, unchanged: 0 },
        { previous: { validatePayload: false }, new: { validatePayload: true } }
      )
    );

    expect(section?.status).toBe('modified');
  });

  it('still marks a payload change as breaking when an existing workflow turns validation on', () => {
    const section = payloadSection(
      workflowResource(
        { added: 0, modified: 1, deleted: 0, unchanged: 0 },
        {
          previous: { payloadSchema: REQUIRED_AMOUNT_SCHEMA, validatePayload: false },
          new: { payloadSchema: REQUIRED_AMOUNT_SCHEMA, validatePayload: true },
        }
      )
    );

    expect(section?.status).toBe('breaking');
    expect(section?.schemaChanges?.some((change) => change.severity === 'breaking')).toBe(true);
    expect(section?.schemaPreview?.note).toContain('Turns on payload validation');
  });
});
