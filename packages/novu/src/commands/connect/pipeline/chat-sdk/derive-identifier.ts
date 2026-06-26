export function deriveAgentIdentifier(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return slug || 'my-chat-sdk-agent';
}

export function defaultAgentNameFromDir(dirName: string): string {
  const cleaned = dirName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return 'My Chat SDK Agent';
  }

  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
