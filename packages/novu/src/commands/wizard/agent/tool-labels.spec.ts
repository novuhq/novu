import { describe, expect, it } from 'vitest';
import { extractToolLabel } from './tool-labels';

describe('extractToolLabel', () => {
  it('renders Read/Write/Edit labels relative to the project root when cwd is provided', () => {
    const label = extractToolLabel(
      'Read',
      { file_path: '/Users/me/proj/app/api/checkout/route.ts' },
      { cwd: '/Users/me/proj' }
    );
    expect(label.short).toBe('app/api/checkout/route.ts');
    expect(label.full).toBe('/Users/me/proj/app/api/checkout/route.ts');
  });

  it('falls back to the file basename for Read/Write/Edit when cwd is omitted', () => {
    const label = extractToolLabel('Read', { file_path: '/tmp/foo/bar.ts' });
    expect(label.short).toBe('bar.ts');
    expect(label.full).toBe('/tmp/foo/bar.ts');
  });

  it('renders files outside the project root with a `..` prefix', () => {
    const label = extractToolLabel(
      'Edit',
      { file_path: '/Users/me/other-proj/src/index.ts' },
      { cwd: '/Users/me/proj' }
    );
    expect(label.short).toBe('../other-proj/src/index.ts');
  });

  it('resolves a relative file_path against the supplied cwd', () => {
    const label = extractToolLabel('Write', { file_path: 'app/api/checkout/route.ts' }, { cwd: '/Users/me/proj' });
    expect(label.short).toBe('app/api/checkout/route.ts');
  });

  it('extracts a Skill invocation by name', () => {
    expect(extractToolLabel('Skill', { skill: 'inbox-integration' }).short).toBe('inbox-integration');
    expect(extractToolLabel('Skill', { name: 'trigger-notification' }).short).toBe('trigger-notification');
    expect(extractToolLabel('Skill', { command: '/dashboard-workflows' }).short).toBe('dashboard-workflows');
  });

  it('falls back to JSON for an unrecognized Skill input shape', () => {
    const label = extractToolLabel('Skill', { unexpected: true });
    expect(label.short).toContain('unexpected');
  });

  it('extracts the server name for ListMcpResourcesTool', () => {
    expect(extractToolLabel('ListMcpResourcesTool', { server: 'novu' }).short).toBe('novu');
    expect(extractToolLabel('ListMcpResourcesTool', {}).short).toBe('all servers');
  });

  it('returns the URL for WebFetch', () => {
    const label = extractToolLabel('WebFetch', { url: 'https://docs.novu.co/llms.txt' });
    expect(label.short).toBe('https://docs.novu.co/llms.txt');
  });
});
