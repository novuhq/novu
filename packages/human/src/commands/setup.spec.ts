import { describe, expect, it, vi } from 'vitest';

const { resolveOperatorName } = await import('./setup');

describe('resolveOperatorName', () => {
  it('uses --name without prompting', async () => {
    const prompt = vi.fn();

    await expect(resolveOperatorName({ name: 'Dima Grossman' }, false, { isTTY: true, prompt })).resolves.toEqual({
      firstName: 'Dima',
      lastName: 'Grossman',
    });
    expect(prompt).not.toHaveBeenCalled();
  });

  it('prompts once on a first-run TTY and accepts an empty answer', async () => {
    const prompt = vi.fn().mockResolvedValue('Alice');
    await expect(resolveOperatorName({}, false, { isTTY: true, prompt })).resolves.toEqual({ firstName: 'Alice' });
    expect(prompt).toHaveBeenCalledTimes(1);

    const empty = vi.fn().mockResolvedValue('   ');
    await expect(resolveOperatorName({}, false, { isTTY: true, prompt: empty })).resolves.toBeUndefined();
  });

  it('never prompts when already set up or when stdin is not a TTY', async () => {
    const prompt = vi.fn();

    await expect(resolveOperatorName({}, true, { isTTY: true, prompt })).resolves.toBeUndefined();
    await expect(resolveOperatorName({}, false, { isTTY: false, prompt })).resolves.toBeUndefined();
    expect(prompt).not.toHaveBeenCalled();
  });
});
