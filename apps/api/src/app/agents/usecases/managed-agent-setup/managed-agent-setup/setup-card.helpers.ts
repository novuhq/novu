import type { StoredAttachment } from '../../../services/agent-attachment-storage.service';

export function buildSetupCard(params: {
  connectActions: { name: string; authorizeUrl: string }[];
  resolved?: boolean;
}): Record<string, unknown> {
  if (params.resolved) {
    return {
      type: 'card',
      children: [
        {
          type: 'text',
          content: 'All set — your integrations are connected. Working on your request…',
        },
      ],
    };
  }

  const children: Record<string, unknown>[] = [
    {
      type: 'text',
      content:
        'Connect the integrations below to use this agent. Once they are connected, I will handle your message — no need to retype it.',
    },
    { type: 'divider' },
    {
      type: 'actions',
      children: params.connectActions.map((action) => ({
        type: 'link-button',
        label: `Connect ${action.name}`,
        url: action.authorizeUrl,
        style: 'primary',
      })),
    },
  ];

  return {
    type: 'card',
    children,
  };
}

export function mapStoredAttachmentsFromRichContent(
  richContent?: Record<string, unknown>
): StoredAttachment[] | undefined {
  const rawAttachments = richContent?.attachments;

  if (!Array.isArray(rawAttachments)) {
    return undefined;
  }

  const storedAttachments = rawAttachments.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const attachment = item as Record<string, unknown>;
    const storageKey = attachment.storageKey;

    if (typeof storageKey !== 'string' || storageKey.length === 0) {
      return [];
    }

    return [
      {
        type: typeof attachment.type === 'string' ? attachment.type : 'file',
        name: typeof attachment.name === 'string' ? attachment.name : undefined,
        mimeType: typeof attachment.mimeType === 'string' ? attachment.mimeType : undefined,
        size: typeof attachment.size === 'number' ? attachment.size : undefined,
        storageKey,
        url: typeof attachment.url === 'string' ? attachment.url : undefined,
      },
    ];
  });

  if (!storedAttachments.length) {
    return undefined;
  }

  return storedAttachments;
}
