import axios from 'axios';

export const FILE_INFO_CARD_CONTENT_TYPE = 'application/vnd.microsoft.teams.card.file.info';

/** A simple `PUT …/content` upload accepts files up to 250 MB; larger ones need an upload session. */
export const MAX_SIMPLE_UPLOAD_BYTES = 250 * 1024 * 1024;

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ETAG_GUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
// SharePoint and OneDrive refuse these characters, and control characters, in file names.
const INVALID_FILE_NAME_CHARACTERS = /["*:<>?/\\|]|\p{Cc}/gu;

const FILE_TYPES_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/json': 'json',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

/** Graph addresses a team by its Microsoft Entra group id; Bot Framework uses a `19:…` thread id. */
export function isGuid(value: string): boolean {
  return GUID.test(value);
}

export function toSafeFileName(name: string): string {
  const cleaned = name
    .replace(INVALID_FILE_NAME_CHARACTERS, '_')
    .trim()
    .replace(/[.\s]+$/, '');

  return cleaned || 'file';
}

/**
 * The file card's `uniqueId` is the GUID inside the drive item's eTag, e.g. `"{1A2B…},3"` → `1A2B…`.
 * Graph documents the same value as the attachment id of a `reference` file attachment.
 */
export function eTagToUniqueId(eTag: string | undefined): string | undefined {
  return eTag?.match(ETAG_GUID)?.[1];
}

/** Teams picks the file icon from `fileType`: the extension, lowercase, without the dot. */
export function getFileType(name: string, mime: string): string {
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;

  return extension || FILE_TYPES_BY_MIME[mime?.toLowerCase()] || 'file';
}

/** A Microsoft Graph or Bot Framework call made while sending a file failed. */
export class TeamsFileError extends Error {}

type GraphErrorContext = 'channel-folder' | 'onedrive' | 'upload' | 'team' | 'member' | 'post';

/** Turns a failed Graph or Bot Framework call into a sentence for the activity log. */
export function describeTeamsFileError(error: unknown, context: GraphErrorContext): string {
  if (error instanceof TeamsFileError) {
    return error.message;
  }

  if (!axios.isAxiosError(error) || !error.response) {
    return `Microsoft Teams file upload failed: ${error instanceof Error ? error.message : String(error)}`;
  }

  const { status, data } = error.response;
  const detail = data?.error?.message || data?.message || error.message;

  if (status === 401) {
    return `Microsoft rejected the app's token (401): ${detail}`;
  }

  if (status === 403 && context !== 'post') {
    return (
      'The Teams app is not allowed to store files in this tenant. Add the Microsoft Graph application ' +
      `permission Files.ReadWrite.All to the app and have the tenant admin grant consent again (403: ${detail}).`
    );
  }

  if (status === 404 && context === 'onedrive') {
    return `The recipient's OneDrive was not found. It is created the first time they open OneDrive (404: ${detail}).`;
  }

  if (status === 404 && context === 'channel-folder') {
    return `Couldn't find the channel's files folder in SharePoint (404: ${detail}).`;
  }

  if (status === 404 && context === 'team') {
    return `Couldn't look up the team for this channel (404: ${detail}).`;
  }

  if (status === 413 || status === 507) {
    return `The file is too large for the recipient's storage (${status}: ${detail}).`;
  }

  return `Microsoft ${context === 'post' ? 'Teams' : 'Graph'} error ${status}: ${detail}`;
}
