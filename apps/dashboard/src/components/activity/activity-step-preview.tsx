import {
  ChannelCTATypeEnum,
  IActivityJob,
  IEmailBlock,
  IMessageCTA,
  StepTypeEnum,
} from '@novu/shared';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  RiChat1Line,
  RiCodeSSlashLine,
  RiExternalLinkLine,
  RiEyeLine,
  RiInboxLine,
  RiMailLine,
  RiMessage2Line,
  RiNotification2Line,
  RiSmartphoneLine,
} from 'react-icons/ri';
import { LogoCircle } from '@/components/icons';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { CodeBlock } from '@/components/primitives/code-block';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { sanitizeEmailHtml } from '@/utils/sanitize-email-html';
import { cn } from '@/utils/ui';
import { ActivityDetailCard } from './activity-detail-card';

interface ActivityStepPreviewProps {
  job: IActivityJob;
}

const PREVIEWABLE_STEP_TYPES = new Set<StepTypeEnum>([
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.IN_APP,
  StepTypeEnum.PUSH,
  StepTypeEnum.CHAT,
]);

/**
 * Normalizes content which could be a raw string, JSON string, or IEmailBlock array.
 */
function normalizeContent(content: unknown): string {
  if (!content) return '';

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    // Array of IEmailBlock
    return content
      .map((block: IEmailBlock) => {
        if (typeof block === 'string') return block;
        if (block?.content) return block.content;
        if (block?.type === 'button') return `[Button: ${block.content || 'Click'}]`;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  if (typeof content === 'object') {
    return JSON.stringify(content, null, 2);
  }

  return String(content);
}

/**
 * Strips HTML tags for plain text channels (SMS, Push, Chat).
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function ActivityStepPreview({ job }: ActivityStepPreviewProps) {
  const stepType = job.type as StepTypeEnum;

  if (!PREVIEWABLE_STEP_TYPES.has(stepType)) {
    return null;
  }

  const template = job.step?.template;

  if (!template) {
    return null;
  }

  const rawContent = template.content;
  const content = normalizeContent(rawContent);
  const subject = template.subject || '';
  const title = template.title || '';
  const preheader = template.preheader || '';
  const senderName = template.senderName || '';
  const cta = template.cta as IMessageCTA | undefined;

  // If there's truly no content or subject/title to preview, skip rendering
  if (!content && !subject && !title) {
    return null;
  }

  const StepIcon = STEP_TYPE_TO_ICON[stepType as keyof typeof STEP_TYPE_TO_ICON] || RiMailLine;
  const label = STEP_TYPE_LABELS[stepType] || stepType;

  return (
    <ActivityDetailCard
      title={
        <div className="flex items-center gap-2">
          <StepIcon className="h-3.5 w-3.5 text-foreground-600" />
          <span>{label} Preview</span>
        </div>
      }
      expandable={true}
      open={true}
    >
      <div className="w-full">
        {stepType === StepTypeEnum.EMAIL && (
          <EmailStepPreview
            subject={subject}
            content={content}
            preheader={preheader}
            senderName={senderName}
            job={job}
          />
        )}

        {stepType === StepTypeEnum.SMS && (
          <SmsStepPreview content={content} job={job} />
        )}

        {stepType === StepTypeEnum.PUSH && (
          <PushStepPreview title={title || subject} content={content} job={job} />
        )}

        {stepType === StepTypeEnum.IN_APP && (
          <InAppStepPreview title={title || subject} content={content} cta={cta} job={job} />
        )}

        {stepType === StepTypeEnum.CHAT && (
          <ChatStepPreview content={content} senderName={senderName} job={job} />
        )}
      </div>
    </ActivityDetailCard>
  );
}

// ---------------------------------------------------------------------------
// Email Preview
// ---------------------------------------------------------------------------

interface EmailStepPreviewProps {
  subject: string;
  content: string;
  preheader?: string;
  senderName?: string;
  job: IActivityJob;
}

function EmailStepPreview({ subject, content, preheader, senderName, job }: EmailStepPreviewProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  const sanitizedHtml = isHtml ? sanitizeEmailHtml(content) : '';

  // Wraps sanitized HTML in a minimal clean stylesheet for proper iframe rendering
  const iframeDoc = isHtml
    ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      margin: 0;
      padding: 16px;
      background-color: #ffffff;
      word-break: break-word;
    }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; }
    a { color: #2563eb; }
  </style>
</head>
<body>${sanitizedHtml}</body>
</html>`
    : '';

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white p-3 border border-neutral-200 shadow-2xs">
      {/* Email metadata header */}
      <div className="flex flex-col gap-1.5 border-b border-neutral-100 pb-2.5 text-xs">
        {subject && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground-950 shrink-0 w-16">Subject:</span>
            <span className="text-foreground-800 font-medium">{subject}</span>
          </div>
        )}

        {senderName && (
          <div className="flex items-start gap-2">
            <span className="text-foreground-500 shrink-0 w-16">From:</span>
            <span className="text-foreground-700">{senderName}</span>
          </div>
        )}

        {preheader && (
          <div className="flex items-start gap-2">
            <span className="text-foreground-500 shrink-0 w-16">Preheader:</span>
            <span className="text-foreground-600 italic">{preheader}</span>
          </div>
        )}

        {/* View mode toggle */}
        {isHtml && (
          <div className="flex items-center justify-end gap-1 pt-1">
            <Button
              variant="secondary"
              mode={viewMode === 'visual' ? 'filled' : 'ghost'}
              size="xs"
              onClick={() => setViewMode('visual')}
              className="gap-1 text-2xs h-6 px-2"
            >
              <RiEyeLine className="h-3 w-3" />
              Preview
            </Button>
            <Button
              variant="secondary"
              mode={viewMode === 'code' ? 'filled' : 'ghost'}
              size="xs"
              onClick={() => setViewMode('code')}
              className="gap-1 text-2xs h-6 px-2"
            >
              <RiCodeSSlashLine className="h-3 w-3" />
              Source HTML
            </Button>
          </div>
        )}
      </div>

      {/* Email Body */}
      {viewMode === 'visual' && isHtml ? (
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white">
          <iframe
            srcDoc={iframeDoc}
            title="Email Preview"
            sandbox="allow-same-origin"
            className="w-full min-h-[220px] max-h-[450px] border-0"
          />
        </div>
      ) : viewMode === 'code' ? (
        <div className="max-h-[350px] overflow-auto rounded-md border border-neutral-200">
          <CodeBlock code={content} language="html" theme="light" />
        </div>
      ) : (
        <div className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 font-sans text-xs text-foreground-800 border border-neutral-100">
          {content || '(Empty message)'}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SMS Preview
// ---------------------------------------------------------------------------

interface SmsStepPreviewProps {
  content: string;
  job: IActivityJob;
}

function SmsStepPreview({ content, job }: { content: string; job: IActivityJob }) {
  const plainText = stripHtml(content) || content;
  const subscriberPhone = job.subscriberId || 'Subscriber';

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-3 shadow-xs">
        {/* Phone header mockup */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <RiSmartphoneLine className="h-4 w-4 text-foreground-500" />
            <span className="text-xs font-medium text-foreground-700">{subscriberPhone}</span>
          </div>
          <Badge variant="lighter" color="gray" size="sm">
            SMS
          </Badge>
        </div>

        {/* Message Bubble */}
        <div className="flex justify-start my-2">
          <div className="relative max-w-[85%] rounded-2xl rounded-tl-sm bg-neutral-100 px-3.5 py-2.5 text-xs text-foreground-900 leading-relaxed shadow-2xs">
            <p className="whitespace-pre-wrap">{plainText || '(Empty message)'}</p>
            <div className="mt-1 flex justify-end">
              <span className="text-[10px] text-foreground-400">
                {job.updatedAt ? format(new Date(job.updatedAt), 'HH:mm') : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Character count footer */}
        <div className="flex justify-between items-center pt-2 border-t border-neutral-100 text-[10px] text-foreground-400">
          <span>{plainText.length} characters</span>
          <span>{Math.ceil(plainText.length / 160) || 1} segment(s)</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Push Preview
// ---------------------------------------------------------------------------

interface PushStepPreviewProps {
  title: string;
  content: string;
  job: IActivityJob;
}

function PushStepPreview({ title, content, job }: PushStepPreviewProps) {
  const plainText = stripHtml(content) || content;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
        {/* Push Notification Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-neutral-900 p-0.5 text-white">
              <LogoCircle />
            </div>
            <span className="text-xs font-semibold text-foreground-900">Novu</span>
          </div>
          <span className="text-[10px] text-foreground-400">
            {job.updatedAt ? format(new Date(job.updatedAt), 'HH:mm') : 'now'}
          </span>
        </div>

        {/* Push Content */}
        <div className="space-y-1 pl-7">
          {title && <h4 className="text-xs font-semibold text-foreground-950 leading-tight">{title}</h4>}
          <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap">
            {plainText || '(Empty message)'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// In-App Preview
// ---------------------------------------------------------------------------

interface InAppStepPreviewProps {
  title: string;
  content: string;
  cta?: IMessageCTA;
  job: IActivityJob;
}

function InAppStepPreview({ title, content, cta, job }: InAppStepPreviewProps) {
  const plainText = stripHtml(content) || content;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-start gap-3">
          {/* In-app bell icon */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-foreground-700">
            <RiInboxLine className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            {title && <h4 className="text-xs font-semibold text-foreground-950 leading-snug">{title}</h4>}
            <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap">
              {plainText || '(Empty message)'}
            </p>

            {/* CTA action button if configured */}
            {cta?.data?.url && (
              <div className="pt-1.5">
                <a
                  href={cta.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-2xs font-medium text-white hover:bg-neutral-800 transition-colors"
                >
                  <span>{cta.type === ChannelCTATypeEnum.REDIRECT ? 'Visit Link' : 'Action'}</span>
                  <RiExternalLinkLine className="h-3 w-3" />
                </a>
              </div>
            )}

            <div className="pt-1">
              <span className="text-[10px] text-foreground-400">
                {job.updatedAt ? format(new Date(job.updatedAt), 'MMM d, HH:mm') : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat Preview
// ---------------------------------------------------------------------------

interface ChatStepPreviewProps {
  content: string;
  senderName?: string;
  job: IActivityJob;
}

function ChatStepPreview({ content, senderName, job }: ChatStepPreviewProps) {
  const plainText = stripHtml(content) || content;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-start gap-3">
          {/* Bot Avatar */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white">
            <LogoCircle />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground-950">{senderName || 'Novu'}</span>
              <span className="rounded bg-neutral-100 px-1 py-0.2 text-[9px] font-semibold text-foreground-600">
                BOT
              </span>
              <span className="text-[10px] text-foreground-400">
                {job.updatedAt ? format(new Date(job.updatedAt), 'HH:mm') : ''}
              </span>
            </div>

            <div className="text-xs text-foreground-800 leading-relaxed whitespace-pre-wrap">
              {plainText || '(Empty message)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
