import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from './types';

export const otpTemplate: WorkflowTemplate = {
  id: 'one-time-password',
  name: 'One Time Password',
  description: 'Send verification codes via email and SMS',
  category: 'authentication',
  isPopular: true,
  workflowDefinition: {
    name: 'One Time Password',
    description: '',
    workflowId: 'one-time-password',
    steps: [
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          subject: ' Verify Your Identity',
          body: '{"type":"doc","content":[{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/5f1528e4a6109a09086e396b5c9d43cb.png?raw=true","alt":null,"title":null,"width":270,"height":203.05785123966945,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"heading","attrs":{"textAlign":"center","level":1},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Your 2FA code"},{"type":"hardBreak"}]},{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"#f5f5f5","align":"center","borderWidth":2,"borderColor":"#e2e2e2","paddingTop":5,"paddingRight":5,"paddingBottom":5,"paddingLeft":5,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"variable","attrs":{"id":"payload.otp","label":null,"fallback":"123456","required":false}}]}]},{"type":"paragraph","attrs":{"textAlign":"center"},"content":[{"type":"hardBreak"},{"type":"text","text":"Not expecting this email?"},{"type":"hardBreak"},{"type":"text","text":"Contact "},{"type":"text","marks":[{"type":"link","attrs":{"href":"mailto:login@plaid.com","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"underline"}],"text":"login@acme.com"},{"type":"text","text":" if you did not request this code."}]}]}',
        },
      },
      {
        name: 'SMS Step',
        type: StepTypeEnum.SMS,
        controlValues: {
          body: 'Your verification code is {{payload.otp}}\n\nDo not share it with anyone.\nThe code expires in 15 minutes',
        },
      },
    ],
    tags: ['authentication'],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
