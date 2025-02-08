import { Button } from '@/components/primitives/button';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import TruncatedText from '@/components/truncated-text';
import { StepResponseDto } from '@novu/shared';
import { RiArrowRightUpLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { ExternalLink } from '../../shared/external-link';

type ConfigureStepTemplateIssueCtaProps = {
  step: StepResponseDto;
  issue: string;
};
export const ConfigureStepTemplateIssueCta = (props: ConfigureStepTemplateIssueCtaProps) => {
  const { step, issue } = props;

  return (
    <SidebarContent>
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
      <Link to={'./edit'} relative="path" state={{ stepType: step.type }}>
        <Button
          size="sm"
          variant="secondary"
          mode="outline"
          className="flex w-full justify-start gap-1.5 text-xs font-medium"
          type="button"
        >
          <span className="bg-destructive h-4 min-w-1 rounded-full" />
          <TruncatedText>{issue}</TruncatedText>
          <RiArrowRightUpLine className="text-destructive ml-auto h-4 w-4" />
        </Button>
      </Link>
    </SidebarContent>
  );
};
