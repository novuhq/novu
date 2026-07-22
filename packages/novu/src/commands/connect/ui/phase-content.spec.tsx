import { PasswordInput, TextInput } from '@inkjs/ui';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PhaseContent } from './phase-content';
import type { Phase } from './store';

function collectElementTypes(node: unknown, acc: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    for (const child of node) collectElementTypes(child, acc);

    return acc;
  }

  if (React.isValidElement(node)) {
    acc.push(node.type);
    collectElementTypes((node.props as { children?: unknown }).children, acc);
  }

  return acc;
}

function renderPromptSecret(phase: Extract<Phase, { kind: 'prompt-secret' }>): unknown[] {
  const element = PhaseContent({
    phase,
    onChannelHover: vi.fn(),
    previewMorphComplete: false,
  });

  return collectElementTypes(element);
}

describe('PhaseContent · prompt-secret', () => {
  const basePhase = {
    kind: 'prompt-secret' as const,
    title: 'Anthropic API key',
    placeholder: 'sk-ant-…',
    resolve: vi.fn(),
  };

  it('masks secret credentials with PasswordInput by default', () => {
    const types = renderPromptSecret(basePhase);

    expect(types).toContain(PasswordInput);
    expect(types).not.toContain(TextInput);
  });

  it('masks credentials when secret is explicitly true', () => {
    const types = renderPromptSecret({ ...basePhase, secret: true });

    expect(types).toContain(PasswordInput);
    expect(types).not.toContain(TextInput);
  });

  it('renders a plain TextInput only when the field opts out with secret: false', () => {
    const types = renderPromptSecret({
      ...basePhase,
      title: 'AWS Claude workspace ID',
      placeholder: 'wrkspc_…',
      secret: false,
    });

    expect(types).toContain(TextInput);
    expect(types).not.toContain(PasswordInput);
  });
});
