import { ChatProviderIdEnum } from '@novu/shared';
import { GenericAgentIntegrationGuide } from './generic-agent-integration-guide';
import { SlackAgentIntegrationGuide } from './slack-agent-integration-guide';

type ResolveAgentIntegrationGuideProps = {
  providerId: string;
  onBack: () => void;
  embedded?: boolean;
};

export function ResolveAgentIntegrationGuide({
  providerId,
  onBack,
  embedded = false,
}: ResolveAgentIntegrationGuideProps) {
  if (providerId === ChatProviderIdEnum.Slack) {
    return <SlackAgentIntegrationGuide embedded={embedded} onBack={onBack} />;
  }

  return <GenericAgentIntegrationGuide embedded={embedded} providerId={providerId} onBack={onBack} />;
}
