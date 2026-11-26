/** A Slack Web API call for a file upload answered `ok: false`. */
export class SlackFileApiError extends Error {
  constructor(
    readonly code: string,
    readonly needed?: string
  ) {
    super(`Slack API Error: ${code}`);
  }
}

/** `files.getUploadURLExternal` hands back where to send the bytes; accept only Slack's own https hosts. */
export function isSlackUploadUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' && (url.hostname === 'slack.com' || url.hostname.endsWith('.slack.com'));
  } catch {
    return false;
  }
}

/** Turns a Slack error code from the file upload methods into a sentence for the activity log. */
export function describeSlackFileError(code: string, needed?: string): string {
  switch (code) {
    case 'missing_scope':
      return `The Slack app is missing the ${needed || 'files:write'} scope. Add it under OAuth & Permissions in the Slack app settings, then reinstall the app or reconnect the workspace.`;
    case 'not_in_channel':
      return 'The Slack app is not a member of this channel. Invite the app to the channel to send files.';
    case 'channel_not_found':
    case 'invalid_channel':
      return "Slack couldn't find the conversation to share the file in.";
    case 'file_uploads_disabled':
    case 'file_uploads_except_images_disabled':
    case 'file_type_not_allowed':
    case 'blocked_file_type':
    case 'slack_connect_blocked_file_type':
    case 'slack_connect_file_upload_sharing_blocked':
    case 'file_upload_size_restricted':
      return `The Slack workspace doesn't allow this file (${code}).`;
    case 'storage_limit_reached':
      return 'The Slack workspace has reached its file storage limit.';
    case 'invalid_auth':
    case 'not_authed':
    case 'token_expired':
    case 'token_revoked':
    case 'account_inactive':
      return `Slack rejected the app's token (${code}). Reconnect the Slack workspace.`;
    case 'unexpected_upload_url':
      return 'Slack returned an unexpected upload address, so the file was not sent.';
    default:
      return `Slack file upload failed: ${code}`;
  }
}
