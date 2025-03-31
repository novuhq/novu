import { Avatar, AvatarImage } from '@/components/primitives/avatar';
import { MAILY_EMAIL_WIDTH } from '@/components/workflow-editor/steps/email/maily';
import { cn } from '@/utils/ui';
import { HTMLAttributes, useEffect, useRef } from 'react';
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
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    if (!shadowRootRef.current) return;
    shadowRootRef.current.innerHTML = body;
  }, [body]);

  return (
    <div
      className={cn(`shadow-xs mx-auto min-h-80 w-full max-w-[${MAILY_EMAIL_WIDTH}px] overflow-auto p-2`, className)}
      // use shadow DOM to isolate the styles
      ref={(node) => {
        if (node && !node.shadowRoot) {
          shadowRootRef.current = node.attachShadow({ mode: 'open' });
          shadowRootRef.current.innerHTML = body;
        }
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
