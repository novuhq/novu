import { describe, expect, it } from 'vitest';
import { readTar, writeTar } from './tar';

/** 143 bytes: longer than a header's 100-byte name field, so the path is split into its prefix and name. */
const LONG_PATH = `references/${'deep/'.repeat(25)}file.md`;

const FILES = [
  { path: 'SKILL.md', content: Buffer.from('---\nname: example\ndescription: An example.\n---\n') },
  { path: LONG_PATH, content: Buffer.from('a long path\n') },
  { path: 'empty.txt', content: Buffer.alloc(0) },
  { path: 'two-blocks.bin', content: Buffer.alloc(1024, 7) },
  { path: 'ünïcode/naïve.md', content: Buffer.from('a non-ASCII path\n') },
];

describe('tar', () => {
  it('reads back every file it wrote, in path order', () => {
    const { files, comment } = readTar(writeTar(FILES));

    expect(comment).toBeNull();
    expect(files.map((file) => file.path)).toEqual([
      'SKILL.md',
      'empty.txt',
      LONG_PATH,
      'two-blocks.bin',
      'ünïcode/naïve.md',
    ]);
    for (const file of files) {
      expect(file.content).toEqual(FILES.find((written) => written.path === file.path)?.content);
    }
  });

  it('writes the same bytes for the same files, whatever order they come in', () => {
    expect(writeTar([...FILES].reverse()).equals(writeTar(FILES))).toBe(true);
  });

  it('refuses a path that no header can hold', () => {
    expect(() => writeTar([{ path: 'x'.repeat(120), content: Buffer.alloc(1) }])).toThrow('too long for a tar header');
  });
});
