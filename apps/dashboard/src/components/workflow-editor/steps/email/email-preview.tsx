import { ResourceOriginEnum } from '@novu/shared';
import { HTMLAttributes, useCallback, useEffect, useRef } from 'react';
import { RiArrowDownSFill } from 'react-icons/ri';
import { MAILY_EMAIL_WIDTH } from '@/components/maily/maily-config';
import { Avatar, AvatarImage } from '@/components/primitives/avatar';
import { Skeleton } from '@/components/primitives/skeleton';
import { usePrimaryEmailIntegration } from '@/hooks/use-primary-email-integration';
import { cn } from '@/utils/ui';
import { NovuBranding } from './novu-branding';

type EmailPreviewHeaderProps = HTMLAttributes<HTMLDivElement> & { minimalHeader?: boolean };

export const EmailPreviewHeader = (props: EmailPreviewHeaderProps) => {
  const { className, children, minimalHeader = false, ...rest } = props;
  const { senderEmail, senderName, isLoading } = usePrimaryEmailIntegration();

  const displaySenderName = senderName || 'Acme Inc.';
  const displaySenderEmail = senderEmail || 'noreply@novu.co';

  return (
    <div className={cn('flex gap-2', className)} {...rest}>
      {!minimalHeader && (
        <Avatar className="size-8">
          <AvatarImage src="/images/building.svg" />
        </Avatar>
      )}
      <div className="flex flex-1 justify-between">
        <div>
          <div>
            {isLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              <>
                {displaySenderName} <span className="text-foreground-600 text-xs">{`<${displaySenderEmail}>`}</span>
              </>
            )}
          </div>
          {!minimalHeader && (
            <div className="text-foreground-600 flex items-center gap-1 text-xs">
              to me <RiArrowDownSFill />
            </div>
          )}
        </div>
        <div className="flex items-center">{children}</div>
      </div>
    </div>
  );
};

type EmailPreviewSubjectProps = HTMLAttributes<HTMLHeadingElement> & {
  subject: string;
};

export const EmailPreviewSubject = (props: EmailPreviewSubjectProps) => {
  const { subject, className, ...rest } = props;

  return (
    <h3 className={cn('p-2.5', className)} {...rest}>
      {subject}
    </h3>
  );
};

type EmailPreviewBodyProps = HTMLAttributes<HTMLDivElement> & {
  body: string;
  resourceOrigin: ResourceOriginEnum;
};

export const EmailPreviewBody = (props: EmailPreviewBodyProps) => {
  const { body, className, resourceOrigin, ...rest } = props;
  const refNode = useRef<HTMLDivElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  const processBody = useCallback((shadowRoot: ShadowRoot, bodyToProcess: string) => {
    // use a template to parse the full HTML
    const template = document.createElement('template');
    template.innerHTML = bodyToProcess;

    const doc = template.content;
    const style = document.createElement('style');

    /**
     * Hide the Novu branding image in the email preview,
     * we use a React component instead in the dashboard.
     * The image is used only for the actual email delivery.
     */
    style.textContent = `
      /* Hide Novu branding table in email preview */
      table[data-novu-branding] {
        display: none !important;
      }
    `;

    // find the last style tag and append the new style to it
    const styleTags = doc.querySelectorAll('style');
    const lastStyleTag = styleTags[styleTags.length - 1];

    if (lastStyleTag) {
      lastStyleTag.after(style);
    } else {
      doc.prepend(style);
    }

    // give a bit of time for the dom changes to be applied
    setTimeout(() => {
      shadowRoot.innerHTML = template.innerHTML;
    }, 0);
  }, []);

  const attachShadow = useCallback(
    (node: HTMLDivElement | null, bodyToProcess: string) => {
      if (node && !node.shadowRoot) {
        // use shadow DOM to isolate the styles
        const shadowRoot = node.attachShadow({ mode: 'open' });
        shadowRootRef.current = shadowRoot;

        processBody(shadowRoot, bodyToProcess);
      }
    },
    [processBody]
  );

  useEffect(() => {
    if (!shadowRootRef.current) return;

    processBody(shadowRootRef.current, body);
  }, [processBody, body]);

  return (
    <div {...rest} className={cn(`mx-auto flex w-full flex-col max-w-[${MAILY_EMAIL_WIDTH}px]`, className)}>
      <div
        className={cn(`shadow-xs min-h-80 w-full overflow-auto p-0`)}
        ref={(node) => {
          refNode.current = node;
          attachShadow(node, body);
        }}
      />
      <NovuBranding resourceOrigin={resourceOrigin} />
    </div>
  );
};

type EmailPreviewContentMobileProps = HTMLAttributes<HTMLDivElement>;

export const EmailPreviewContentMobile = (props: EmailPreviewContentMobileProps) => {
  const { className, ...rest } = props;

  return <div className={cn('bg-background max-w-sm', className)} {...rest} />;
};

type EmailPreviewBodyMobileProps = HTMLAttributes<HTMLDivElement> & {
  body: string;
  resourceOrigin: ResourceOriginEnum;
};

export const EmailPreviewBodyMobile = (props: EmailPreviewBodyMobileProps) => {
  const { body, className, resourceOrigin, ...rest } = props;
  const refNode = useRef<HTMLDivElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  const processBody = useCallback((shadowRoot: ShadowRoot, bodyToProcess: string) => {
    // use a template to parse the full HTML
    const template = document.createElement('template');
    template.innerHTML = bodyToProcess;

    const doc = template.content;
    const style = document.createElement('style');

    /**
     * Hide the Novu branding image in the email preview,
     * we use a React component instead in the dashboard.
     * The image is used only for the actual email delivery.
     */
    style.textContent = `
      /* Hide Novu branding table in email preview */
      table[data-novu-branding] {
        display: none !important;
      }
      
      /* Mobile-specific styles */
      body {
        margin: 0;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `;

    // find the last style tag and append the new style to it
    const styleTags = doc.querySelectorAll('style');
    const lastStyleTag = styleTags[styleTags.length - 1];

    if (lastStyleTag) {
      lastStyleTag.after(style);
    }

    // give a bit of time for the dom changes to be applied
    setTimeout(() => {
      shadowRoot.innerHTML = template.innerHTML;
    }, 0);
  }, []);

  const attachShadow = useCallback(
    (node: HTMLDivElement | null, bodyToProcess: string) => {
      if (node && !node.shadowRoot) {
        // use shadow DOM to isolate the styles
        const shadowRoot = node.attachShadow({ mode: 'open' });
        shadowRootRef.current = shadowRoot;

        processBody(shadowRoot, bodyToProcess);
      }
    },
    [processBody]
  );

  useEffect(() => {
    if (!shadowRootRef.current) return;

    processBody(shadowRootRef.current, body);
  }, [processBody, body]);

  return (
    <div className={cn('flex flex-col', className)} {...rest}>
      <div
        className="mx-auto min-h-96 w-full overflow-auto px-4"
        ref={(node) => {
          refNode.current = node;
          attachShadow(node, body);
        }}
      />
      <NovuBranding resourceOrigin={resourceOrigin} />
    </div>
  );
};

type EmailPreviewSubjectMobileProps = HTMLAttributes<HTMLDivElement> & {
  subject: string;
};

export const EmailPreviewSubjectMobile = (props: EmailPreviewSubjectMobileProps) => {
  const { subject, className, ...rest } = props;

  return (
    <div className={cn('bg-neutral-50 p-4', className)} {...rest}>
      <h3 className="line-clamp-2">{subject}</h3>
    </div>
  );
};
