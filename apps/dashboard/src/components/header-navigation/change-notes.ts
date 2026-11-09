import type { IResourceDiffResult } from '@/api/environments';

const REMOVAL_SENTENCE = 'Publishing removes this from Production.';

export const AGENT_INACTIVE_NOTE = 'This agent will publish as Inactive until it is configured in Production.';

function formatNameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function uniqueNames(names: string[]): string[] {
  return [...new Set(names.filter((name) => name.length > 0))];
}

/** Sentence on a deleted workflow, layout, step, or translation group. */
export function removalNote(dependentNames: string[]): string {
  const names = uniqueNames(dependentNames);
  if (names.length === 0) return REMOVAL_SENTENCE;

  const verb = names.length === 1 ? 'uses' : 'use';

  return `${REMOVAL_SENTENCE} ${formatNameList(names)} still ${verb} it there.`;
}

/** Warning shown on a workflow that still uses something this publish removes. */
export function dependencyWarning(removedNames: string[]): string {
  const names = uniqueNames(removedNames);
  const list = formatNameList(names);
  if (names.length <= 1) {
    return `Publishing removes ${list} from Production. This workflow uses it.`;
  }

  return `Publishing removes ${list} from Production. This workflow uses them.`;
}

export function dependentNames(resource: IResourceDiffResult): string[] {
  if (resource.summary.deleted === 0) return [];
  // Workflow dependencies point at layouts and agents this workflow needs.
  // Reverse dependencies, stored on a deleted layout or agent, point at workflows that use it.
  if (resource.resourceType === 'workflow') return [];

  return uniqueNames(
    (resource.dependencies ?? [])
      .filter((dependency) => dependency.resourceType === 'workflow')
      .map((dependency) => dependency.resourceName)
  );
}

function resourceKey(resource: IResourceDiffResult): string | undefined {
  return resource.sourceResource?.id || resource.targetResource?.id || undefined;
}

/**
 * Workflows that depend on a deleted resource which is included in this publish.
 * Keyed by the workflow identifier used on the change row.
 */
export function dependencyWarningsByWorkflow(
  resources: IResourceDiffResult[],
  isPublishing: (resourceId: string) => boolean
): Map<string, string> {
  const removedByWorkflow = new Map<string, string[]>();

  for (const resource of resources) {
    if (resource.summary.deleted === 0) continue;

    const id = resourceKey(resource);
    if (!id || !isPublishing(id)) continue;

    const name = resource.targetResource?.name || resource.sourceResource?.name;
    if (!name) continue;

    for (const dependency of resource.dependencies ?? []) {
      if (dependency.resourceType !== 'workflow' || !dependency.resourceId) continue;

      const names = removedByWorkflow.get(dependency.resourceId) ?? [];
      names.push(name);
      removedByWorkflow.set(dependency.resourceId, names);
    }
  }

  return new Map([...removedByWorkflow].map(([workflowId, names]) => [workflowId, dependencyWarning(names)]));
}
