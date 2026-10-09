import { readFile } from 'node:fs/promises';

/** Matches the API's limit for an agent picture. */
export const AGENT_PICTURE_MAX_BYTES = 2 * 1024 * 1024;

const DOWNLOAD_TIMEOUT_MS = 15_000;

export type AgentPictureFile = { file: Buffer; contentType: 'image/jpeg' | 'image/png' };

/** What the file really is, read from its first bytes: its name can say anything. */
export function detectPictureType(file: Buffer): AgentPictureFile['contentType'] | null {
  if (file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff) {
    return 'image/jpeg';
  }

  if (file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  return null;
}

/** Checks a picture here, so a wrong file is refused before anything is uploaded. */
export function checkPicture(file: Buffer): AgentPictureFile {
  if (file.length > AGENT_PICTURE_MAX_BYTES) {
    throw new Error('The picture must be 2 MB or smaller.');
  }

  const contentType = detectPictureType(file);
  if (!contentType) {
    throw new Error('The picture must be a JPEG or a PNG.');
  }

  return { file, contentType };
}

/** Reads a picture from a file on this computer, or downloads it when given a web address. */
export async function loadPicture(source: string): Promise<AgentPictureFile> {
  return checkPicture(/^https?:\/\//i.test(source) ? await download(source) : await readLocal(source));
}

async function readLocal(path: string): Promise<Buffer> {
  try {
    return await readFile(path);
  } catch {
    throw new Error(`Could not read the picture at "${path}".`);
  }
}

async function download(url: string): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  } catch {
    throw new Error(`Could not download the picture from ${url}.`);
  }

  if (!response.ok) {
    throw new Error(`Could not download the picture from ${url} (HTTP ${response.status}).`);
  }

  // A stated length saves downloading something that is plainly too large.
  if (Number(response.headers.get('content-length') ?? 0) > AGENT_PICTURE_MAX_BYTES) {
    throw new Error('The picture must be 2 MB or smaller.');
  }

  return Buffer.from(await response.arrayBuffer());
}
