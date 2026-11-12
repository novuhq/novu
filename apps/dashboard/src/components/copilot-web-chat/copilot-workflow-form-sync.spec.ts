import { describe, expect, it } from 'vitest';
import { getFieldsToSync } from './copilot-workflow-form-sync';

const workflow = { name: 'Welcome', description: 'Greets new users', tags: ['onboarding'] };

describe('getFieldsToSync', () => {
  it('takes over a field the Copilot changed while the form still shows the old value', () => {
    const renamed = { ...workflow, name: 'Welcome v2' };

    expect(getFieldsToSync(workflow, renamed, workflow)).toEqual(['name']);
  });

  it('keeps a field the user edited, even when the Copilot changed it too', () => {
    const renamed = { ...workflow, name: 'Welcome v2' };

    expect(getFieldsToSync(workflow, renamed, { ...workflow, name: 'My title' })).toEqual([]);
  });

  it('still syncs the untouched fields after the user edited another one', () => {
    const renamed = { ...workflow, name: 'Welcome v2' };
    const edited = { ...workflow, description: 'Greets new users by email' };

    expect(getFieldsToSync(workflow, renamed, edited)).toEqual(['name']);
  });

  it('syncs every field the Copilot changed in one update', () => {
    const next = { name: 'Welcome v2', description: 'New copy', tags: ['onboarding', 'email'] };

    expect(getFieldsToSync(workflow, next, workflow)).toEqual(['name', 'description', 'tags']);
  });

  it('does nothing when the workflow did not change', () => {
    expect(getFieldsToSync(workflow, { ...workflow }, { ...workflow, name: 'My title' })).toEqual([]);
  });

  it('treats an undefined description and an empty one as the same', () => {
    const cleared = { name: 'Welcome', description: undefined, tags: ['onboarding'] };

    expect(getFieldsToSync(workflow, cleared, workflow)).toEqual(['description']);
    expect(getFieldsToSync(cleared, { ...cleared, description: '' }, { ...workflow, description: '' })).toEqual([]);
  });

  it('compares tags by value, not by reference', () => {
    expect(getFieldsToSync(workflow, { ...workflow, tags: ['onboarding'] }, workflow)).toEqual([]);
  });
});
