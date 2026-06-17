import type { Attachment } from 'chat';
import type { ReplyFileRef } from './types.js';

const MAX_INLINE_FILE_BYTES = 5 * 1024 * 1024;
const CHUNK_SIZE = 0x8000;
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

type FileUploadLike = {
  data: Buffer | Blob | ArrayBuffer | Uint8Array;
  filename: string;
  mimeType?: string;
};

function getGlobalBuffer():
  | {
      isBuffer?: (value: unknown) => boolean;
      from: (value: ArrayBuffer | Uint8Array) => { toString: (encoding: 'base64') => string };
    }
  | undefined {
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

function assertInlineFileSize(size: number, filename: string): void {
  if (size > MAX_INLINE_FILE_BYTES) {
    throw new Error(
      `Invalid file "${filename}": inline data must be 5 MB or smaller. Use a publicly-accessible URL for larger files.`
    );
  }
}

async function encodeFileData(data: FileUploadLike['data'], filename: string): Promise<string> {
  if (typeof data === 'string') {
    const decodedLength = decodedBase64Length(data);
    if (decodedLength === null) {
      throw new Error(`Invalid file "${filename}": data must be a base64-encoded string.`);
    }

    assertInlineFileSize(decodedLength, filename);

    return data;
  }

  if (isBuffer(data)) {
    assertInlineFileSize(data.byteLength, filename);

    return data.toString('base64');
  }

  if (data instanceof Uint8Array) {
    assertInlineFileSize(data.byteLength, filename);

    return bytesToBase64(data);
  }

  if (data instanceof ArrayBuffer) {
    assertInlineFileSize(data.byteLength, filename);

    return bytesToBase64(new Uint8Array(data));
  }

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    assertInlineFileSize(data.size, filename);

    return bytesToBase64(new Uint8Array(await data.arrayBuffer()));
  }

  throw new Error(
    `Invalid file "${filename}": data must be a base64 string, Buffer, Uint8Array, ArrayBuffer, or Blob.`
  );
}

function isFileUploadLike(value: unknown): value is FileUploadLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return typeof obj.filename === 'string' && obj.data !== undefined && obj.data !== null;
}

async function attachmentToFileRef(att: Attachment): Promise<ReplyFileRef | null> {
  const filename = att.name ?? 'attachment';

  if (att.url) {
    return {
      filename,
      mimeType: att.mimeType,
      url: att.url,
    };
  }

  if (att.data) {
    return {
      filename,
      mimeType: att.mimeType,
      data: await encodeFileData(att.data as FileUploadLike['data'], filename),
    };
  }

  return null;
}

async function fileUploadToRef(upload: FileUploadLike): Promise<ReplyFileRef> {
  return {
    filename: upload.filename,
    mimeType: upload.mimeType,
    data: await encodeFileData(upload.data, upload.filename),
  };
}

/** Map chat-sdk postable `files` / `attachments` to Novu `ReplyFileRef`s. */
export async function mapReplyFiles(files: unknown): Promise<ReplyFileRef[] | undefined> {
  if (!Array.isArray(files) || files.length === 0) {
    return undefined;
  }

  const refs: ReplyFileRef[] = [];

  for (const item of files) {
    if (isFileUploadLike(item)) {
      refs.push(await fileUploadToRef(item));
      continue;
    }

    const attRef = await attachmentToFileRef(item as Attachment);
    if (attRef) {
      refs.push(attRef);
    }
  }

  if (refs.length === 0) {
    return undefined;
  }

  return refs;
}
