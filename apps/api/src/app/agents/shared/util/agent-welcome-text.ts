import { AgentPlatformEnum } from '../enums/agent-platform.enum';

export function getWelcomeText(platform: AgentPlatformEnum): string {
  switch (platform) {
    case AgentPlatformEnum.SLACK:
      return 'Your Slack app is connected! Send me a message to try it out.';
    case AgentPlatformEnum.TEAMS:
      return 'Your Teams app is connected! Send me a message to try it out.';
    case AgentPlatformEnum.WHATSAPP:
      return 'Connected! Send me a message to try it out.';
    case AgentPlatformEnum.EMAIL:
      return 'Connected! Reply to this email to try it out.';
    default:
      return 'Connected! Send me a message to try it out.';
  }
}
