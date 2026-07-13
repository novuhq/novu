import { createClient } from '@sanity/client';

const SANITY_PROJECT_ID = 'w2rl2099';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2025-02-19';

export const SANITY_CDN_URL = `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}`;

export const sanityClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: false,
  perspective: 'published',
});

type FetchSanityOptions = {
  params?: Record<string, unknown>;
  signal?: AbortSignal;
};

export async function fetchSanity<T>(query: string, options?: FetchSanityOptions): Promise<T> {
  return sanityClient.fetch<T>(query, options?.params ?? {}, { signal: options?.signal });
}
