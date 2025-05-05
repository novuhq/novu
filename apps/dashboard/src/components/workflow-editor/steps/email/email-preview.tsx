import { Avatar, AvatarImage } from '@/components/primitives/avatar';
import { MAILY_EMAIL_WIDTH } from '@/components/workflow-editor/steps/email/maily-config';
import { cn } from '@/utils/ui';
import { HTMLAttributes, useCallback, useEffect, useRef } from 'react';
import { RiArrowDownSFill } from 'react-icons/ri';

type EmailPreviewHeaderProps = HTMLAttributes<HTMLDivElement>;

export const EmailPreviewHeader = (props: EmailPreviewHeaderProps) => {
  const { className, children, ...rest } = props;
  return (
    <div className={cn('flex gap-2', className)} {...rest}>
      <Avatar className="size-8">
        <AvatarImage src="/images/building.svg" />
      </Avatar>
      <div className="flex flex-1 justify-between">
        <div>
          <div>
            Acme Inc. <span className="text-foreground-600 text-xs">{`<noreply@novu.co>`}</span>
          </div>
          <div className="text-foreground-600 flex items-center gap-1 text-xs">
            to me <RiArrowDownSFill />
          </div>
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
};

export const EmailPreviewBody = (props: EmailPreviewBodyProps) => {
  const { body, className, ...rest } = props;
  const refNode = useRef<HTMLDivElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  const processBody = useCallback((shadowRoot: ShadowRoot, bodyToProcess: string) => {
    // use a template to parse the full HTML
    const template = document.createElement('template');
    template.innerHTML = bodyToProcess;

    const doc = template.content;
    const style = document.createElement('style');
    style.textContent = `a {pointer-events: none;}`;

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
    <div
      className={cn(`shadow-xs mx-auto min-h-80 w-full max-w-[${MAILY_EMAIL_WIDTH}px] overflow-auto p-2`, className)}
      ref={(node) => {
        refNode.current = node;
        attachShadow(node, body);
      }}
      {...rest}
    />
  );
};

type EmailPreviewContentMobileProps = HTMLAttributes<HTMLDivElement>;

export const EmailPreviewContentMobile = (props: EmailPreviewContentMobileProps) => {
  const { className, ...rest } = props;

  return <div className={cn('bg-background max-w-sm', className)} {...rest} />;
};

type EmailPreviewBodyMobileProps = HTMLAttributes<HTMLDivElement> & {
  body: string;
};

export const EmailPreviewBodyMobile = (props: EmailPreviewBodyMobileProps) => {
  const { body, className, ...rest } = props;

  return (
    <div
      className={cn('mx-auto min-h-96 w-full px-4', className)}
      dangerouslySetInnerHTML={{ __html: body }}
      {...rest}
    />
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
