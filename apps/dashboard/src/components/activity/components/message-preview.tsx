import { ChannelTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { RiInformationLine, RiMailLine, RiMessage3Line, RiNotification3Line, RiPhoneLine } from 'react-icons/ri';
import { EmailPreviewBody } from '@/components/workflow-editor/steps/email/email-preview';
import { cn } from '@/utils/ui';

interface MessagePreviewProps {
  channel?: ChannelTypeEnum;
  content?: string | null;
  subject?: string | null;
  title?: string | null;
  className?: string;
}

const BODY_NOT_STORED_LABEL = 'Message body was not stored for this delivery';

export function MessagePreview({ channel, content, subject, title, className }: MessagePreviewProps) {
  const hasContent = typeof content === 'string' && content.length > 0;

  if (!hasContent && !subject && !title) {
    return <EmptyPreview label={BODY_NOT_STORED_LABEL} />;
  }

  switch (channel) {
    case ChannelTypeEnum.EMAIL:
      return <EmailChannelPreview content={content} subject={subject} className={className} />;
    case ChannelTypeEnum.SMS:
      return <SmsChannelPreview content={content} className={className} />;
    case ChannelTypeEnum.PUSH:
      return <PushChannelPreview content={content} title={title} className={className} />;
    case ChannelTypeEnum.CHAT:
    case ChannelTypeEnum.IN_APP:
    case ChannelTypeEnum.TOOL:
      return <TextChannelPreview content={content} title={title} className={className} />;
    default:
      return <TextChannelPreview content={content} title={title} className={className} />;
  }
}

function PreviewShell({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-neutral-200 bg-white', className)}>
      <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-3 py-2">
        <span className="text-foreground-600">{icon}</span>
        <span className="text-foreground-950 text-xs font-medium">{label}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function EmptyPreview({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4">
      <RiInformationLine className="text-foreground-400 h-4 w-4 shrink-0" />
      <span className="text-foreground-400 text-xs">{label}</span>
    </div>
  );
}

function EmailChannelPreview({
  content,
  subject,
  className,
}: {
  content?: string | null;
  subject?: string | null;
  className?: string;
}) {
  const body = typeof content === 'string' && content.length > 0 ? content : '';
  const isHtml = body.trim().startsWith('<');

  return (
    <PreviewShell icon={<RiMailLine className="h-3.5 w-3.5" />} label="Email preview" className={className}>
      <div className="flex flex-col gap-2">
        {subject ? (
          <div className="border-b border-neutral-100 pb-2">
            <span className="text-foreground-950 block text-sm font-semibold">{subject}</span>
          </div>
        ) : null}
        {body ? (
          isHtml ? (
            <EmailPreviewBody body={body} resourceOrigin={ResourceOriginEnum.NOVU_CLOUD} />
          ) : (
            <pre className="text-foreground-700 max-h-96 w-full overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-50 p-2 text-xs">
              {body}
            </pre>
          )
        ) : (
          <EmptyPreview label={BODY_NOT_STORED_LABEL} />
        )}
      </div>
    </PreviewShell>
  );
}

function SmsChannelPreview({ content, className }: { content?: string | null; className?: string }) {
  const body = typeof content === 'string' ? content : '';

  if (!body) {
    return (
      <PreviewShell icon={<RiPhoneLine className="h-3.5 w-3.5" />} label="SMS preview" className={className}>
        <EmptyPreview label={BODY_NOT_STORED_LABEL} />
      </PreviewShell>
    );
  }

  return (
    <PreviewShell icon={<RiPhoneLine className="h-3.5 w-3.5" />} label="SMS preview" className={className}>
      <div className="flex max-w-sm flex-col">
        <div className="rounded-2xl rounded-bl-xs bg-neutral-100 px-4 py-2.5 text-foreground-950">
          <p className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{body}</p>
        </div>
      </div>
    </PreviewShell>
  );
}

function PushChannelPreview({
  content,
  title,
  className,
}: {
  content?: string | null;
  title?: string | null;
  className?: string;
}) {
  const body = typeof content === 'string' ? content : '';

  return (
    <PreviewShell icon={<RiNotification3Line className="h-3.5 w-3.5" />} label="Push preview" className={className}>
      <div className="flex max-w-sm flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-3 shadow-xs">
        {title ? <span className="text-foreground-950 text-sm font-semibold">{title}</span> : null}
        {body ? (
          <span className="text-foreground-600 text-xs">{body}</span>
        ) : (
          <span className="text-foreground-400 text-xs">{BODY_NOT_STORED_LABEL}</span>
        )}
      </div>
    </PreviewShell>
  );
}

function TextChannelPreview({
  content,
  title,
  className,
}: {
  content?: string | null;
  title?: string | null;
  className?: string;
}) {
  const body = typeof content === 'string' ? content : '';

  return (
    <PreviewShell icon={<RiMessage3Line className="h-3.5 w-3.5" />} label="Message preview" className={className}>
      <div className="flex flex-col gap-1">
        {title ? <span className="text-foreground-950 text-sm font-semibold">{title}</span> : null}
        {body ? (
          <pre className="text-foreground-700 max-h-96 w-full overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-50 p-2 text-xs">
            {body}
          </pre>
        ) : (
          <EmptyPreview label={BODY_NOT_STORED_LABEL} />
        )}
      </div>
    </PreviewShell>
  );
}
