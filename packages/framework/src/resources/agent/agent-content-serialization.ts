import type { FileRef, MessageContent, ReplyContent } from './agent.types';
import { resolveCardContent } from './resolve-card-content';

const MAX_INLINE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_AGGREGATE_FILE_BYTES = 5 * 1024 * 1024;
const CHUNK_SIZE = 0x8000;
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

function describeFile(file: FileRef, index: number): string {
  return file.filename ? `"${file.filename}"` : `at index ${index}`;
}

function getGlobalBuffer() {
  return (
    globalThis as typeof globalThis & {
      Buffer?: {
        isBuffer?: (value: unknown) => boolean;
        from: (value: ArrayBuffer | Uint8Array) => { toString: (encoding: 'base64') => string };
      };
    }
  ).Buffer;
}

function isBuffer(value: unknown): value is Buffer {
  return getGlobalBuffer()?.isBuffer?.(value) ?? false;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function bytesToBase64(bytes: Uint8Array): string {
  const globalBuffer = getGlobalBuffer();
  if (globalBuffer) {
    return globalBuffer.from(bytes).toString('base64');
  }

  if (typeof btoa !== 'function') {
    throw new Error('Unable to encode file data: base64 encoding is not available in this runtime.');
  }

  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function decodedBase64Length(value: string): number | null {
  const normalized = value.replace(/\s/g, '');
  const remainder = normalized.length % 4;

  if (!normalized || remainder === 1 || !BASE64_REGEX.test(normalized)) {
    return null;
  }

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;

  return Math.floor((normalized.length * 3) / 4) - padding;
}

function assertInlineFileSize(size: number, file: FileRef, index: number): void {
  if (size > MAX_INLINE_FILE_BYTES) {
    throw new Error(
      `Invalid file ${describeFile(file, index)}: inline data must be 5 MB or smaller. ` +
        'Use a publicly-accessible URL for larger files.'
    );
  }
}

async function encodeFileData(data: NonNullable<FileRef['data']>, file: FileRef, index: number): Promise<string> {
  if (typeof data === 'string') {
    const decodedLength = decodedBase64Length(data);
    if (decodedLength === null) {
      throw new Error(`Invalid file ${describeFile(file, index)}: data must be a base64-encoded string.`);
    }

    assertInlineFileSize(decodedLength, file, index);

    return data;
  }

  if (isBuffer(data)) {
    assertInlineFileSize(data.byteLength, file, index);

    return data.toString('base64');
  }

  if (data instanceof Uint8Array) {
    assertInlineFileSize(data.byteLength, file, index);

    return bytesToBase64(data);
  }

  if (data instanceof ArrayBuffer) {
    assertInlineFileSize(data.byteLength, file, index);

    return bytesToBase64(new Uint8Array(data));
  }

  if (isBlob(data)) {
    assertInlineFileSize(data.size, file, index);

    return bytesToBase64(new Uint8Array(await data.arrayBuffer()));
  }

  throw new Error(
    `Invalid file ${describeFile(file, index)}: data must be a base64 string, Buffer, Uint8Array, ArrayBuffer, or Blob.`
  );
}

async function validateFiles(files?: FileRef[]): Promise<FileRef[] | undefined> {
  if (!files?.length) {
    return undefined;
  }

  const normalized: FileRef[] = [];
  let inlineAggregateSize = 0;

  for (const [index, file] of files.entries()) {
    const data = (file as { data?: unknown }).data;
    const url = (file as { url?: unknown }).url;
    const hasData = data !== undefined && data !== null;
    const hasUrl = url !== undefined && url !== null;

    if (hasData === hasUrl) {
      throw new Error(`Invalid file ${describeFile(file, index)}: provide exactly one of data or url.`);
    }

    if (hasData) {
      const encodedData = await encodeFileData(data as NonNullable<FileRef['data']>, file, index);
      const decodedLength = decodedBase64Length(encodedData);
      inlineAggregateSize += decodedLength ?? 0;

      if (inlineAggregateSize > MAX_INLINE_AGGREGATE_FILE_BYTES) {
        throw new Error(
          `Invalid files: total inline data must be 5 MB or smaller. Use publicly-accessible URLs for larger files.`
        );
      }

      normalized.push({
        ...file,
        data: encodedData,
      });

      continue;
    }

    if (hasUrl && typeof url !== 'string') {
      throw new Error(`Invalid file ${describeFile(file, index)}: url must be a string.`);
    }

    normalized.push(file);
  }

  return normalized;
}

/** Validate/normalise inline files and resolve markdown or a card into a wire-ready reply. */
export async function serializeContent(content: MessageContent, files?: FileRef[]): Promise<ReplyContent> {
  const validFiles = await validateFiles(files);

  if (typeof content === 'string') {
    return validFiles ? { markdown: content, files: validFiles } : { markdown: content };
  }

  const card = await resolveCardContent(content);
  if (card) {
    return validFiles ? { card, files: validFiles } : { card };
  }

  throw new Error('Invalid message content — expected string or CardElement');
}
