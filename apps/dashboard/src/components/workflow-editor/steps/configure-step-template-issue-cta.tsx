import { Button } from '@/components/primitives/button';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import TruncatedText from '@/components/truncated-text';
import { titleize } from '@/utils/titleize';
import { cn } from '@/utils/ui';
import { StepContentIssue, StepIntegrationIssue, StepResponseDto } from '@novu/shared';
import { PropsWithChildren } from 'react';
import { RiArrowRightUpLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { ExternalLink } from '../../shared/external-link';

export const ConfigureStepTemplateIssuesContainer = (props: PropsWithChildren) => {
  const { children } = props;

  return (
    <SidebarContent className="gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Action required</span>
        <ExternalLink
          variant="text"
          underline={false}
          href="https://docs.novu.co/sdks/framework/typescript/steps/inApp"
          className="text-xs"
        >
          <span>Help?</span>
        </ExternalLink>
      </div>
      {children}
    </SidebarContent>
  );
};

type ConfigureStepTemplateIssueCtaProps = {
  step: StepResponseDto;
  issue: StepContentIssue | StepIntegrationIssue;
  type: 'error' | 'info';
};

export const ConfigureStepTemplateIssueCta = (props: ConfigureStepTemplateIssueCtaProps) => {
  const { step, issue, type } = props;
  const isError = type === 'error';

  const linkTo = isError ? './edit' : '/integrations';

  const truncatedTextContent = isError
    ? `Invalid variable: ${issue.variableName}`
    : `${titleize(step.type?.replace('_', ' ') || '')} provider not connected`;

  return (
    <Link to={linkTo} relative="path" state={{ stepType: step.type }}>
      <Button
        size="sm"
        variant="secondary"
        mode="outline"
        className="flex h-full w-full justify-start gap-3 py-2 text-xs"
        type="button"
      >
        <span className={cn(`h-full min-w-1 rounded-full`, { 'bg-destructive': isError, 'bg-bg-sub': !isError })} />
        <div className="flex flex-col items-start gap-0.5">
          <TruncatedText className="font-medium">{truncatedTextContent}</TruncatedText>
          <p className="text-text-soft text-wrap text-start">{issue.message}</p>
        </div>
        <RiArrowRightUpLine
          className={cn(`mb-auto ml-auto size-4 shrink-0`, {
            'text-destructive': isError,
            'text-text-sub': !isError,
          })}
        />
      </Button>
    </Link>
  );
};
