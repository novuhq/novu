export const RESOURCE = {
  SUBSCRIBER: 'subscriber',
} as const;

export type ResourceType = (typeof RESOURCE)[keyof typeof RESOURCE];

// Canonical key: "<type>:<id>"
export type ResourceKey = `${ResourceType}:${string}`;

export type ResourceRef = { type: ResourceType; id: string };

// Build / parse (encode to keep ':' safe in ids)
export const makeResourceKey = (type: ResourceType, id: string): ResourceKey =>
  `${type}:${encodeURIComponent(id)}` as ResourceKey;

export const parseResourceKey = (key: string): ResourceRef => {
  const i = key.indexOf(':');
  if (i <= 0) throw new Error('Invalid resource key');
  return { type: key.slice(0, i) as ResourceType, id: decodeURIComponent(key.slice(i + 1)) };
};

export const isResourceKey = (key: unknown): key is ResourceKey => {
  if (typeof key !== 'string') return false;
  const i = key.indexOf(':');
  if (i <= 0) return false;
  const t = key.slice(0, i) as ResourceType;
  return (Object.values(RESOURCE) as string[]).includes(t) && key.length > i + 1;
};
