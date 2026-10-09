import { describe, expect, it } from 'vitest';
import { checkPicture } from '../agent-picture';
import { parseAgentChanges, renderAgent } from './agent';

describe('parseAgentChanges', () => {
  it('asks for nothing when no flag is passed', () => {
    expect(parseAgentChanges({})).toEqual({});
  });

  it('trims the name and the description', () => {
    expect(parseAgentChanges({ name: ' Deploy bot ', description: ' Ships the app. ' })).toEqual({
      name: 'Deploy bot',
      description: 'Ships the app.',
    });
  });

  it('clears the description with an empty one', () => {
    expect(parseAgentChanges({ description: '' })).toEqual({ description: '' });
  });

  it('refuses an empty name', () => {
    expect(() => parseAgentChanges({ name: '  ' })).toThrow('--name cannot be empty.');
  });

  it('refuses a name longer than the API takes', () => {
    expect(() => parseAgentChanges({ name: 'a'.repeat(61) })).toThrow('60 characters or fewer');
  });
});

describe('renderAgent', () => {
  it('shows the name and the description', () => {
    const output = renderAgent({
      agentId: 'a1',
      agentIdentifier: 'human-relay',
      name: 'Deploy bot',
      description: 'Ships.',
    });

    expect(output).toContain('Deploy bot');
    expect(output).toContain('Ships.');
  });
});

describe('checkPicture', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

  it('takes a PNG and a JPEG', () => {
    expect(checkPicture(png).contentType).toBe('image/png');
    expect(checkPicture(Buffer.from([0xff, 0xd8, 0xff, 0xe0])).contentType).toBe('image/jpeg');
  });

  it('refuses anything else, whatever it is called', () => {
    expect(() => checkPicture(Buffer.from('<svg></svg>'))).toThrow('JPEG or a PNG');
  });

  it('refuses a picture over 2 MB', () => {
    expect(() => checkPicture(Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)]))).toThrow('2 MB');
  });
});
